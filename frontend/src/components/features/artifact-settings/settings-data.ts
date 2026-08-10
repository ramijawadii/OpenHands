import type { Scope } from "./settings-structure";

/**
 * Effective values, with the chain that produced them.
 *
 * The conversation document holds only explicit overrides; everything else is
 * inherited. This module models that resolution so the UI can always answer
 * four questions per field — what is in force, who set it, what the ceiling is,
 * and **which layer bound me** — which is the difference between a settings
 * page an operator trusts and one they guess at.
 *
 * The fourth question is the one the three-layer model could not answer. When
 * an enterprise ceiling has been narrowed by the workspace, "Mandatory —
 * Enterprise" sends the operator to the wrong person. The chain names the layer
 * that actually bound them, and `askContact` names who can change it.
 *
 * A connector replaces `initialValues()` with the real API response; the shape
 * is deliberately the one the resolver already returns.
 */

export type TableRow = Record<string, string>;
export type SettingValue = string | number | boolean | string[] | TableRow[];

/** One layer's contribution, for the narrowing chain. */
export interface ChainLink {
  scope: Scope;
  /** Rendered as written — already formatted for display. */
  value: string;
}

export interface Effective {
  value: SettingValue;
  /** Where the effective value came from. */
  from: Scope;
  /** The most permissive value this conversation may select, when bounded. */
  ceiling?: string | number;
  /** Which layer owns that ceiling — the layer to escalate to. */
  ceilingFrom?: Scope;
  /** Who to ask when the ceiling is in the way. */
  askContact?: string;
  /** Inherited value, shown when the conversation has overridden it. */
  inherited?: SettingValue;
  /**
   * The narrowing path, oldest layer first. Present only where more than one
   * layer actually set a value — a one-element chain is noise.
   */
  chain?: ChainLink[];
}

const V = (
  value: SettingValue,
  from: Scope = "workspace",
  extra: Partial<Effective> = {},
): Effective => ({ value, from, ...extra });

/**
 * Seed values.
 *
 * Chosen to exercise every state the UI must render — inherited, overridden,
 * locked, ceiling-bounded, narrowed-by-workspace, derived-live — rather than a
 * uniform happy path that hides the cases that actually need design.
 *
 * The scenario: a Confidential remediation session in `eu-west-1`, running on a
 * gVisor sandbox, egress narrowed by the operator below what the workspace
 * allows, and a remediation ceiling the workspace already narrowed from what
 * the enterprise permits.
 */
export const SEED: Record<string, Effective> = {
  /* ── Quick ─────────────────────────────────────────────────────────────── */
  "quick.profile": V("remediate_plan", "conversation", {
    inherited: "investigate",
  }),
  "quick.profile.effect": V(
    [
      {
        setting: "Execution ceiling",
        profile: "iac_pr",
        current: "iac_pr",
      },
      {
        setting: "Chat execution mode",
        profile: "plan",
        current: "edit_auto",
      },
      { setting: "Egress mode", profile: "broker", current: "broker" },
      {
        setting: "Require a canary first",
        profile: "on",
        current: "on",
      },
      {
        setting: "Connectors narrowed to read-only",
        profile: "on",
        current: "off",
      },
    ],
    "derived",
  ),
  "quick.posture.isolation": V("gVisor · shared node", "enterprise"),
  "quick.posture.egress": V("Broker only", "conversation"),
  "quick.posture.ceiling": V("IaC pull request", "workspace"),
  "quick.posture.model": V("claude-opus-5 · balanced", "workspace"),

  /* ── Session · posture ─────────────────────────────────────────────────── */
  "session.posture.isolation": V(
    "gVisor — syscall-filtered, shared node",
    "enterprise",
  ),
  "session.posture.tenancy": V("Shared node · per-tenant pool", "enterprise"),
  "session.posture.memoryEncryption": V(
    "None — warm start available",
    "enterprise",
  ),
  "session.posture.attestation": V("Measured at boot · 4h 12m ago", "derived"),
  "session.posture.image": V(
    "openhands-custom:0.59 @ sha256:9f2c4a…",
    "enterprise",
  ),
  "session.posture.hardening": V(
    "seccomp: enforcing · no-new-privs · read-only root",
    "enterprise",
  ),
  "session.posture.boot": V("Cold ~90 s · warm ~2.2 s", "derived"),
  "session.posture.health": V(
    "Running · up 4h 12m · 1 restart · no errors",
    "derived",
  ),

  /* ── Session · lifecycle ───────────────────────────────────────────────── */
  "session.life.idleTimeoutMin": V(30, "workspace", {
    ceiling: 240,
    ceilingFrom: "enterprise",
  }),
  "session.life.maxDurationMin": V(480, "workspace", {
    ceiling: 1440,
    ceilingFrom: "enterprise",
  }),
  "session.life.warmStart": V(true, "workspace"),
  "session.life.autoResume": V(true, "workspace"),
  "session.life.stopOnDisconnect": V(false, "workspace"),
  "session.life.neverExpire": V(false, "enterprise"),

  /* ── Session · resources ───────────────────────────────────────────────── */
  "session.res.profile": V("m", "workspace", {
    ceiling: "l",
    ceilingFrom: "workspace",
    askContact: "workspace admin",
    chain: [
      { scope: "enterprise", value: "xl" },
      { scope: "workspace", value: "l" },
    ],
  }),
  "session.res.usage": V("0.7 vCPU · 2.1 / 4 GiB · 6 / 20 GiB", "derived"),
  "session.res.maxConcurrentTools": V(4, "workspace", {
    ceiling: 16,
    ceilingFrom: "enterprise",
  }),
  "session.res.maxProcesses": V(128, "workspace", {
    ceiling: 512,
    ceilingFrom: "enterprise",
  }),
  "session.res.commandTimeoutSec": V(120, "workspace", {
    ceiling: 900,
    ceilingFrom: "enterprise",
  }),
  "session.res.maxOutputMb": V(10, "workspace", {
    ceiling: 64,
    ceilingFrom: "enterprise",
  }),
  "session.res.vcpu": V(2, "workspace", {
    ceiling: 4,
    ceilingFrom: "workspace",
  }),
  "session.res.memoryGb": V(4, "workspace", {
    ceiling: 8,
    ceilingFrom: "workspace",
  }),
  "session.res.diskGb": V(20, "workspace", {
    ceiling: 100,
    ceilingFrom: "workspace",
  }),
  "session.res.gpu": V("Not granted", "enterprise"),

  /* ── Session · filesystem ──────────────────────────────────────────────── */
  "session.fs.persistence": V("session", "workspace"),
  "session.fs.writablePaths": V(
    ["/workspace", "/tmp", "/cloudguard-shared/staged"],
    "workspace",
  ),
  "session.fs.maxFileMb": V(256, "workspace", {
    ceiling: 2048,
    ceilingFrom: "enterprise",
  }),
  "session.fs.maxTotalGb": V(20, "workspace", {
    ceiling: 100,
    ceilingFrom: "workspace",
  }),
  "session.fs.worm": V(true, "enterprise"),
  "session.fs.mounts": V(
    [
      {
        path: "/workspace",
        source: "conversation volume",
        mode: "rw",
        why: "The working tree for this conversation",
      },
      {
        path: "/cloudguard-shared/approvals",
        source: "control plane",
        mode: "ro",
        why: "Approval decisions the agent must observe but cannot write",
      },
      {
        path: "/cloudguard-shared/staged",
        source: "control plane",
        mode: "rw",
        why: "Where proposed edits are staged for review",
      },
      {
        path: "/evidence",
        source: "object store · WORM",
        mode: "append",
        why: "Write-once evidence — no path deletes from here",
      },
    ],
    "derived",
  ),

  /* ── Session · network ─────────────────────────────────────────────────── */
  "session.net.mode": V("broker", "conversation", {
    ceiling: "allowlist",
    ceilingFrom: "workspace",
    inherited: "allowlist",
    askContact: "platform-security@",
    chain: [
      { scope: "enterprise", value: "allowlist" },
      { scope: "workspace", value: "allowlist" },
      { scope: "conversation", value: "broker" },
    ],
  }),
  "session.net.domains": V(
    ["registry.internal", "github.com", "api.github.com"],
    "workspace",
  ),
  "session.net.cidrs": V(["10.40.0.0/16"], "workspace"),
  "session.net.registries": V(
    ["pypi.mirror.internal", "npm.mirror.internal"],
    "enterprise",
  ),
  "session.net.broker": V(
    "LLM · knowledge base · inventory graph — reachable in every mode",
    "enterprise",
  ),
  "session.net.tlsInspection": V("Enabled · platform CA bundle", "enterprise"),
  "session.net.dnsMode": V("platform", "workspace"),
  "session.net.blockDoh": V(true, "enterprise"),
  "session.net.onBlocked": V("fail", "workspace"),
  "session.net.oneOffTtlMin": V(15, "workspace", {
    ceiling: 60,
    ceilingFrom: "workspace",
  }),
  "session.net.traffic": V(
    [
      {
        dest: "broker.cloudguard.internal",
        verdict: "Allowed",
        requests: "412",
        volume: "18.4 MB",
        first: "04:58",
      },
      {
        dest: "registry.internal",
        verdict: "Allowed",
        requests: "27",
        volume: "94.1 MB",
        first: "05:12",
      },
      {
        dest: "api.github.com",
        verdict: "Blocked — broker mode",
        requests: "3",
        volume: "—",
        first: "07:41",
      },
      {
        dest: "169.254.169.254",
        verdict: "Blocked — link-local",
        requests: "1",
        volume: "—",
        first: "06:03",
      },
    ],
    "derived",
  ),

  /* ── Session · identity ────────────────────────────────────────────────── */
  "session.id.identity": V(
    "sandbox/conv-4471 · no standing credentials",
    "enterprise",
  ),
  "session.id.broker": V("Reachable · last mint 11m ago", "derived"),
  "session.id.grants": V(
    [
      {
        grant: "grant-9f21",
        scope: "ec2:Describe* on acct-57",
        issued: "Blast-radius simulation",
        ttl: "6m",
      },
      {
        grant: "grant-9f4c",
        scope: "s3:GetObject on cg-evidence-eu",
        issued: "Evidence write-back",
        ttl: "22m",
      },
    ],
    "derived",
  ),

  /* ── Chat ──────────────────────────────────────────────────────────────── */
  "chat.model.profile": V("balanced", "workspace"),
  "chat.model.resolved": V("claude-opus-5", "enterprise"),
  "chat.model.maxOutputTokens": V(8192, "workspace", {
    ceiling: 32768,
    ceilingFrom: "enterprise",
  }),
  "chat.model.streaming": V(true, "workspace"),
  "chat.model.promptCaching": V(true, "enterprise"),
  "chat.exec.mode": V("edit_auto", "conversation", {
    ceiling: "autonomous",
    ceilingFrom: "workspace",
    inherited: "autonomous",
    chain: [
      { scope: "enterprise", value: "autonomous" },
      { scope: "workspace", value: "autonomous" },
      { scope: "conversation", value: "edit_auto" },
    ],
  }),
  "chat.exec.maxToolCalls": V(25, "workspace", {
    ceiling: 100,
    ceilingFrom: "enterprise",
  }),
  "chat.exec.confirmWrites": V(true, "enterprise"),
  "chat.exec.confirmDestructive": V(true, "enterprise"),
  "chat.ctx.displayCapTokens": V(200000, "workspace", {
    ceiling: 400000,
    ceilingFrom: "enterprise",
  }),
  "chat.ctx.autoCompact": V(true, "enterprise"),
  "chat.ctx.workingSet": V(true, "workspace"),
  "chat.ctx.persist": V(false, "workspace"),
  "chat.safety.systemPrompt": V(
    "cloudguard/system_prompt v2.0.0",
    "enterprise",
  ),
  "chat.safety.custom": V("", "conversation"),
  "chat.safety.inputScreening": V(true, "enterprise"),
  "chat.safety.outputFilter": V(true, "enterprise"),

  /* ── Tools & catalogs ──────────────────────────────────────────────────── */
  "tools.cat.groups": V(
    ["inventory", "graph", "knowledge-base", "iac", "office"],
    "conversation",
    {
      inherited: [
        "inventory",
        "graph",
        "knowledge-base",
        "iac",
        "office",
        "shell",
        "cloud-write",
      ],
      chain: [
        { scope: "workspace", value: "7 groups" },
        { scope: "conversation", value: "5 groups" },
      ],
    },
  ),
  "tools.cat.commands": V(
    [
      {
        group: "inventory",
        commands: "34",
        tier: "Read-only",
        route: "—",
      },
      { group: "graph", commands: "12", tier: "Read-only", route: "—" },
      {
        group: "knowledge-base",
        commands: "12",
        tier: "Read-only",
        route: "—",
      },
      {
        group: "iac",
        commands: "9",
        tier: "Write",
        route: "Pull request review",
      },
      {
        group: "office",
        commands: "7",
        tier: "Write",
        route: "—",
      },
      {
        group: "cloud-write",
        commands: "21",
        tier: "Gated action",
        route: "Two-person approval",
      },
    ],
    "derived",
  ),
  "tools.cat.neverOffer": V(
    ["shell.interactive", "cloud-write.*"],
    "conversation",
  ),
  "tools.skills.packs": V(
    ["cloud-security", "office-authoring", "diagrams"],
    "workspace",
  ),
  "tools.skills.resolution": V(
    "Graph-backed dispatch · 205 skills indexed",
    "derived",
  ),
  "tools.mcp.servers": V(
    [
      {
        server: "cloudguard-kg",
        tools: "12",
        tier: "Read-only",
        used: "Investigation, blast radius",
      },
      {
        server: "cloudguard-kb",
        tools: "12",
        tier: "Read-only",
        used: "Control lookup",
      },
      {
        server: "office",
        tools: "7",
        tier: "Write",
        used: "Report authoring",
      },
      {
        server: "diagram",
        tools: "6",
        tier: "Write",
        used: "Architecture diagrams",
      },
    ],
    "derived",
  ),
  "tools.mcp.enabled": V(
    ["cloudguard-kg", "cloudguard-kb", "office", "diagram"],
    "workspace",
  ),
  "tools.mcp.install": V("Workspace admin · Connections", "workspace"),
  "tools.conn.action": V(
    [
      {
        connector: "AWS · acct-57 (prod)",
        scope: "Read-only",
        ceiling: "Read + write",
        health: "Connected",
        expires: "in 14d",
      },
      {
        connector: "AWS · acct-85 (prod-eu)",
        scope: "Read-only",
        ceiling: "Read + write",
        health: "Connected",
        expires: "in 14d",
      },
      {
        connector: "GitHub · acme/infrastructure",
        scope: "Read + write",
        ceiling: "Read + write",
        health: "Connected",
        expires: "in 61d",
      },
      {
        connector: "Jira · SEC",
        scope: "Read + write",
        ceiling: "Read + write",
        health: "Auth expires soon",
        expires: "in 2d",
      },
    ],
    "derived",
  ),
  "tools.conn.scope": V(false, "conversation"),
  "tools.conn.ingestion": V(
    [
      {
        feed: "AWS Config · acct-57",
        lag: "4m",
        last: "09:12:41Z",
        health: "Healthy",
      },
      {
        feed: "AWS Config · acct-85",
        lag: "6m",
        last: "09:10:22Z",
        health: "Healthy",
      },
      {
        feed: "CloudTrail · org trail",
        lag: "11m",
        last: "09:05:03Z",
        health: "Healthy",
      },
      {
        feed: "Azure Activity Log",
        lag: "3h 41m",
        last: "05:35:18Z",
        health: "Degraded — stale",
      },
    ],
    "derived",
  ),

  /* ── Canvas ────────────────────────────────────────────────────────────── */
  "canvas.editors.defaultView": V("documents", "workspace"),
  "canvas.editors.enabled": V(
    ["documents", "sheet", "notebook", "whiteboard"],
    "workspace",
  ),
  "canvas.editors.maxResident": V(3, "workspace", {
    ceiling: 6,
    ceilingFrom: "workspace",
  }),
  "canvas.editors.memory": V("412 MB across 2 resident panes", "derived"),
  "canvas.editors.evictAfterMin": V(10, "workspace"),
  "canvas.editors.prewarmOnHover": V(true, "workspace"),
  "canvas.autosave.enabled": V(true, "enterprise"),
  "canvas.autosave.intervalSec": V(30, "workspace"),
  "canvas.versions.keep": V(20, "workspace"),
  "canvas.versions.onExport": V(true, "workspace"),
  "canvas.doc.agentMayEdit": V(true, "workspace"),
  "canvas.doc.liveEditing": V(false, "workspace"),
  "canvas.doc.confirmBeforeOverwrite": V(true, "workspace"),
  "canvas.doc.branding": V("Inference Defense", "enterprise"),
  "canvas.sheet.maxRows": V(100000, "workspace", {
    ceiling: 500000,
    ceilingFrom: "enterprise",
  }),
  "canvas.sheet.importMaxMb": V(25, "workspace", {
    ceiling: 200,
    ceilingFrom: "enterprise",
  }),
  "canvas.sheet.formulaEngine": V(
    "Local engine · no external calls",
    "enterprise",
  ),
  "canvas.sheet.externalRefs": V(false, "enterprise"),
  "canvas.nb.kernelImage": V("python-3.12-sec", "workspace"),
  "canvas.nb.maxKernels": V(2, "workspace", {
    ceiling: 8,
    ceilingFrom: "workspace",
  }),
  "canvas.nb.idleReapMin": V(15, "workspace", {
    ceiling: 60,
    ceilingFrom: "enterprise",
  }),
  "canvas.nb.execTimeoutSec": V(300, "workspace", {
    ceiling: 900,
    ceilingFrom: "enterprise",
  }),
  "canvas.nb.maxOutputMb": V(10, "workspace", {
    ceiling: 64,
    ceilingFrom: "enterprise",
  }),
  "canvas.nb.packageInstall": V(false, "workspace"),
  "canvas.nb.kernels": V(
    [
      {
        kernel: "python3 · k-7f21",
        notebook: "prowler_analysis.ipynb",
        memory: "186 MB",
        idle: "0s",
      },
      {
        kernel: "python3 · k-7f44",
        notebook: "blast_radius.ipynb",
        memory: "94 MB",
        idle: "11m",
      },
    ],
    "derived",
  ),
  "canvas.dia.shapeCatalog": V("strict", "workspace"),
  "canvas.dia.templateLibrary": V(true, "workspace"),
  "canvas.dia.exportFormats": V(["png", "svg", "drawio"], "workspace"),
  "canvas.dia.remoteAssets": V(false, "enterprise"),

  /* ── Report ────────────────────────────────────────────────────────────── */
  "report.template": V("remediation", "workspace"),
  "report.formats": V(["pdf", "docx"], "conversation", {
    inherited: ["pdf", "docx", "xlsx", "tex"],
  }),
  "report.diagramSource": V("Inline · catalog shapes only", "enterprise"),
  "report.compileGate": V(
    "Enforcing — structural failure blocks output",
    "enterprise",
  ),
  "report.evidenceManifest": V(true, "enterprise"),
  "report.redaction": V("standard_pii", "derived", {
    chain: [
      { scope: "workspace", value: "standard" },
      {
        scope: "derived",
        value: "standard + PII — Confidential data in scope",
      },
    ],
  }),
  "report.retention": V("7 years · Compliance lock", "enterprise"),

  /* ── Remediation ───────────────────────────────────────────────────────── */
  "rem.ceiling": V("iac_pr", "workspace", {
    ceiling: "iac_pr",
    ceilingFrom: "workspace",
    askContact: "workspace admin",
    chain: [
      { scope: "enterprise", value: "canary" },
      { scope: "workspace", value: "iac_pr" },
    ],
  }),
  "rem.canaryRequired": V(true, "workspace"),
  "rem.brrFreshness": V("90 s — re-simulates past this", "enterprise"),
  "rem.quorum": V("Two-person · security + resource owner", "enterprise"),
  "rem.additionalApprovers": V(["k.novak"], "conversation", {
    inherited: [],
  }),
  "rem.approvalTimeoutMin": V(60, "workspace", {
    ceiling: 480,
    ceilingFrom: "enterprise",
  }),
  "rem.repo": V("acme/infrastructure", "workspace"),
  "rem.baseBranch": V("main", "workspace"),
  "rem.requireCi": V(true, "workspace"),
  "rem.ticketProject": V("SEC", "workspace"),
  "rem.rollbackJournal": V("14 entries · inverse recorded for 13", "derived"),

  /* ── Sharing ───────────────────────────────────────────────────────────── */
  "share.defaultVisibility": V("workspace", "conversation", {
    inherited: "private",
    chain: [
      { scope: "workspace", value: "private" },
      { scope: "conversation", value: "workspace" },
    ],
  }),
  "share.classification": V(
    "Confidential — derived from data in scope",
    "derived",
  ),
  "share.artifacts": V(
    [
      {
        artifact: "remediation-summary.docx",
        type: "Report",
        audience: "Workspace",
        setBy: "Default",
      },
      {
        artifact: "blast_radius.ipynb",
        type: "Notebook",
        audience: "Private to m.haddad",
        setBy: "m.haddad",
      },
      {
        artifact: "network-topology.drawio",
        type: "Diagram",
        audience: "Workspace",
        setBy: "Default",
      },
      {
        artifact: "evidence-bundle.json",
        type: "Evidence",
        audience: "Audit role only",
        setBy: "Policy",
      },
    ],
    "derived",
  ),
  "share.links.enabled": V(true, "workspace"),
  "share.links.maxTtlDays": V(7, "workspace", {
    ceiling: 7,
    ceilingFrom: "workspace",
    askContact: "workspace admin",
    chain: [
      { scope: "enterprise", value: "90 days" },
      { scope: "workspace", value: "7 days" },
    ],
  }),
  "share.links.active": V([], "derived"),
  "share.export.formats": V(["pdf", "docx", "json"], "workspace"),
  "share.export.redaction": V("standard_pii", "derived"),
  "share.export.evidence": V(false, "enterprise"),

  /* ── Data ──────────────────────────────────────────────────────────────── */
  "data.transcriptRetention": V("90 days · Governance lock", "workspace"),
  "data.evidenceRetention": V(
    "7 years · Compliance lock — until 2033-08-10",
    "enterprise",
  ),
  "data.legalHold": V("None active", "derived"),
  "data.residency": V(
    "eu-west-1 — data does not leave the region",
    "enterprise",
  ),
  "data.redactionProfile": V("standard_pii", "derived", {
    chain: [
      { scope: "workspace", value: "standard" },
      {
        scope: "derived",
        value: "standard + PII — Confidential data in scope",
      },
    ],
  }),
  "data.customPatterns": V(
    ["acct-[0-9]{2}", "arn:aws:iam::[0-9]+"],
    "workspace",
  ),

  /* ── Observability ─────────────────────────────────────────────────────── */
  "obs.ledger": V(
    [
      {
        time: "09:14:02",
        command: "terraform plan -out=remediation.tfplan",
        exit: "0",
        duration: "18.4s",
      },
      {
        time: "09:11:47",
        command: "aws ec2 describe-security-groups --region eu-west-1",
        exit: "0",
        duration: "1.2s",
      },
      {
        time: "09:08:15",
        command: "curl https://api.github.com/repos/acme/infrastructure",
        exit: "7",
        duration: "0.1s",
      },
      {
        time: "09:02:33",
        command: "python analyze_findings.py --format json",
        exit: "0",
        duration: "4.8s",
      },
    ],
    "derived",
  ),
  "obs.security": V(
    [
      {
        time: "09:08:15",
        event: "Egress blocked",
        detail: "api.github.com — not reachable in broker mode",
      },
      {
        time: "07:41:09",
        event: "Egress blocked",
        detail: "api.github.com — not reachable in broker mode",
      },
      {
        time: "06:03:52",
        event: "Egress blocked",
        detail: "169.254.169.254 — link-local metadata endpoint",
      },
      {
        time: "05:22:10",
        event: "Screening hit",
        detail: "Instruction-like text in an ingested S3 object tag — stripped",
      },
    ],
    "derived",
  ),
  "obs.logLevel": V("info", "workspace"),
  "obs.metrics": V("CPU 18% avg · peak 74% · memory 2.1 / 4 GiB", "derived"),
};

export function initialValues(): Record<string, Effective> {
  return { ...SEED };
}

const SCOPE_LABEL: Record<Scope, string> = {
  enterprise: "Enterprise",
  business_unit: "Business unit",
  workspace: "Workspace",
  conversation: "Set here",
  derived: "Derived",
};

export function scopeLabel(s: Scope): string {
  return SCOPE_LABEL[s];
}

/** Short form for the chain, where "Set here" would read oddly mid-sentence. */
const CHAIN_LABEL: Record<Scope, string> = {
  ...SCOPE_LABEL,
  conversation: "You",
};

export function chainLabel(s: Scope): string {
  return CHAIN_LABEL[s];
}

/** Display form for a value inside a table cell or chain link. */
export function formatValue(v: SettingValue): string {
  if (typeof v === "boolean") return v ? "on" : "off";
  if (Array.isArray(v)) {
    if (v.length === 0) return "none";
    if (typeof v[0] === "string") return (v as string[]).join(", ");
    return `${v.length} rows`;
  }
  return String(v);
}

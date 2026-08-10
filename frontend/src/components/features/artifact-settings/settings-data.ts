import type { Provenance } from "./settings-structure";

/**
 * Effective values, with where each came from.
 *
 * The artifact document holds only explicit overrides; everything else is
 * inherited. This module models that resolution so the UI can always answer
 * three questions per field — what is in force, who set it, and what the
 * ceiling is — which is the whole difference between a settings page an
 * operator trusts and one they guess at.
 *
 * A connector replaces `resolve()` with the real API response; the shape is
 * deliberately the one the resolver already returns.
 */

export interface Effective {
  value: string | number | boolean | string[];
  /** Where the effective value came from. */
  from: Provenance;
  /** The most permissive value this artifact may select, when bounded. */
  ceiling?: string | number;
  /** Inherited value, shown when the artifact has overridden it. */
  inherited?: string | number | boolean | string[];
}

const V = (
  value: Effective["value"],
  from: Provenance = "workspace",
  extra: Partial<Effective> = {},
): Effective => ({ value, from, ...extra });

/**
 * Seed values.
 *
 * Chosen to exercise every state the UI must render — inherited, overridden,
 * locked, ceiling-bounded — rather than a uniform happy path that hides the
 * cases that actually need design.
 */
export const SEED: Record<string, Effective> = {
  // ── AI ───────────────────────────────────────────────────────────────────
  "ai.model.profile": V("balanced", "workspace"),
  "ai.model.resolved": V("claude-opus-5", "platform"),
  "ai.model.maxOutputTokens": V(8192, "workspace", { ceiling: 32768 }),
  "ai.model.streaming": V(true, "workspace"),
  "ai.model.promptCaching": V(true, "platform"),

  "ai.instructions.systemPrompt": V(
    "cloudguard/system_prompt v2.0.0",
    "platform",
  ),
  "ai.instructions.custom": V("", "artifact"),
  "ai.instructions.skillPacks": V(
    ["cloud-security", "office-authoring", "diagrams"],
    "workspace",
  ),

  "ai.memory.autoCompact": V(true, "platform"),
  "ai.memory.compactAtTokens": V(200000, "workspace", { ceiling: 400000 }),
  "ai.memory.workingSet": V(true, "workspace"),
  "ai.memory.persist": V(false, "workspace"),

  "ai.autonomy.mode": V("ask", "artifact", {
    ceiling: "autonomous",
    inherited: "autonomous",
  }),
  "ai.autonomy.confirmReads": V(false, "workspace"),
  "ai.autonomy.confirmWrites": V(true, "platform"),
  "ai.autonomy.confirmDestructive": V(true, "platform"),
  "ai.autonomy.maxToolCalls": V(25, "workspace", { ceiling: 100 }),

  "ai.usage.tokens": V("1.24M in · 186K out", "derived"),
  "ai.usage.requests": V("412", "derived"),
  "ai.usage.cacheHit": V("78%", "derived"),
  "ai.usage.quota": V("1.4M of 10M this month", "derived"),

  // ── Runtime ──────────────────────────────────────────────────────────────
  "rt.health.status": V("Running", "derived"),
  "rt.health.uptime": V("4h 12m", "derived"),
  "rt.health.restarts": V("1", "derived"),
  "rt.health.isolation": V("gVisor — shared node", "platform"),
  "rt.health.attestation": V("Measured · 4h ago", "platform"),

  "rt.res.profile": V("m", "workspace", { ceiling: "l" }),
  "rt.res.usage": V("0.7 vCPU · 2.1 / 4 GiB · 6 / 20 GiB", "derived"),
  "rt.res.idleTimeoutMin": V(30, "workspace", { ceiling: 240 }),
  "rt.res.maxConcurrentTools": V(4, "workspace", { ceiling: 16 }),
  "rt.res.commandTimeoutSec": V(120, "workspace", { ceiling: 900 }),

  "rt.env.image": V("openhands-custom:0.59 @ sha256:9f2c…", "platform"),
  "rt.env.persistence": V("session", "workspace"),
  "rt.env.wormEvidence": V(true, "platform"),
  "rt.env.packageInstall": V(false, "workspace"),

  "rt.act.commands": V("87", "derived"),
  "rt.act.processes": V("12", "derived"),
  "rt.act.lastCommand": V("terraform plan -out=remediation.tfplan", "derived"),
  "rt.act.securityEvents": V("3 blocked egress · 0 injection", "derived"),

  // ── Context ──────────────────────────────────────────────────────────────
  "ctx.cloud.accounts": V(["acct-57", "acct-85"], "artifact", {
    inherited: ["acct-57", "acct-85", "acct-91", "acct-12"],
  }),
  "ctx.cloud.regions": V(["eu-west-1", "us-east-1"], "workspace"),
  "ctx.cloud.credentials": V("Broker · no standing credentials", "platform"),
  "ctx.cloud.activeGrants": V("None — minted per approval", "derived"),

  "ctx.kb.packs": V(["CIS", "NIST", "ATT&CK", "CCM"], "workspace"),
  "ctx.kb.version": V("kb_version 6 · 4.77M nodes", "platform"),
  "ctx.kb.graphIndex": V("Fresh · rebuilt 2h ago", "derived"),
  "ctx.kb.retrievalDepth": V(2, "workspace"),

  "ctx.dev.repo": V("acme/infrastructure", "workspace"),
  "ctx.dev.branch": V("main", "workspace"),
  "ctx.dev.prTemplate": V("remediation", "workspace"),
  "ctx.dev.requireCi": V(true, "workspace"),

  "ctx.ops.ticketSystem": V("jira", "workspace"),
  "ctx.ops.project": V("SEC", "workspace"),
  "ctx.ops.autoCreate": V(true, "workspace"),
  "ctx.ops.notify": V("#cloud-security", "workspace"),

  "ctx.perm.egress": V("broker", "artifact", {
    ceiling: "allowlist",
    inherited: "allowlist",
  }),
  "ctx.perm.allowlist": V(["registry.internal", "github.com"], "workspace"),
  "ctx.perm.remediationCeiling": V("iac_pr", "artifact", {
    ceiling: "typed",
    inherited: "typed",
  }),
  "ctx.perm.tools": V(["kb", "graph", "inventory", "office"], "artifact", {
    inherited: ["kb", "graph", "inventory", "office", "shell", "browser"],
  }),
  "ctx.perm.role": V("Operator", "platform"),

  // ── Sharing ──────────────────────────────────────────────────────────────
  "sh.visibility": V("workspace", "artifact", { inherited: "private" }),
  "sh.classification": V("Confidential", "derived"),
  "sh.members.list": V(["m.haddad", "k.novak"], "artifact"),
  "sh.members.owner": V("m.haddad", "derived"),
  "sh.members.canEditSettings": V("owner", "workspace"),
  "sh.links.enabled": V(false, "workspace"),
  "sh.links.expiry": V(7, "workspace", { ceiling: 90 }),
  "sh.links.active": V("None", "derived"),
  "sh.res.reports": V(true, "workspace"),
  "sh.res.evidence": V(false, "workspace"),
  "sh.res.transcript": V(false, "workspace"),
  "sh.res.redaction": V("Standard + PII", "derived"),

  // ── Maintenance ──────────────────────────────────────────────────────────
  "mt.diag.last": V("Never", "derived"),
};

export function initialValues(): Record<string, Effective> {
  return { ...SEED };
}

const PROV_LABEL: Record<Provenance, string> = {
  platform: "Enterprise",
  workspace: "Workspace",
  artifact: "Set here",
  derived: "Derived",
};

export function provenanceLabel(p: Provenance): string {
  return PROV_LABEL[p];
}

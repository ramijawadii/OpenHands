import {
  EPOCH,
  KINDS,
  OWNERS,
  ROLES,
  SEVERITIES,
  TITLES,
  hash,
  locationOf,
  num,
  pick,
  type ActionSeverity,
  type Provenance,
  type RemediationAction,
} from "./remediation-data";

/**
 * Detail data for the record's non-Overview panes.
 *
 * Split from `remediation-data.ts` because that file owns the ACTION — the
 * thing the list shows and the export serialises — while this one owns the
 * per-pane depth. Keeping them together made a 900-line module where a change
 * to a table column sat beside a change to an audit chain.
 *
 * Every builder is deterministic from the action, so a pane, the list row and
 * the export can never disagree.
 */

/* ------------------------------------------------------------------ *
 * Related findings · assets · controls · frameworks · MITRE
 * ------------------------------------------------------------------ */

export interface LinkedFinding {
  id: string;
  title: string;
  severity: ActionSeverity;
  detector: string;
  firstSeen: Date;
  /** Whether THIS action closes it outright, or only part of it. */
  closes: "Full" | "Partial";
  provenance: Provenance;
}

export interface LinkedAsset {
  id: string;
  name: string;
  kind: string;
  criticality: "Tier 0" | "Tier 1" | "Tier 2";
  dataClass: "Restricted" | "Confidential" | "Internal" | "Public";
  exposure: string;
}

/** A control with the delta this action produces — not merely its name. */
export interface LinkedControl {
  id: string;
  family: string;
  title: string;
  /** NIST CSF 2.0 function.category */
  csf: string;
  before: "Fail" | "Partial" | "Pass";
  after: "Fail" | "Partial" | "Pass";
}

export interface LinkedFramework {
  id: string;
  name: string;
  /** Framework name as it belongs in front of the id — "CIS AWS", "PCI DSS". */
  short: string;
  /** The id without its framework prefix, so the tag does not say it twice. */
  ref: string;
  requirement: string;
  coverageBefore: number;
  coverageAfter: number;
}

/**
 * ATT&CK and D3FEND are DIFFERENT taxonomies and are modelled separately.
 *
 * ATT&CK names what an adversary does with the weakness; D3FEND names the
 * countermeasure this remediation implements. Products routinely conflate the
 * two and present an offensive technique as their "response" — naming the
 * D3FEND countermeasure is what makes the claim real.
 */
export interface AttackMapping {
  technique: string;
  techniqueName: string;
  tactic: string;
}

export interface DefendMapping {
  id: string;
  name: string;
  /** The ATT&CK technique this countermeasure addresses. */
  counters: string;
}

const DETECTORS = [
  "cspm-scanner",
  "iam-analyzer",
  "network-reachability",
  "config-drift",
  "cve-feed",
];

const ATTACK: [string, string, string][] = [
  ["T1190", "Exploit Public-Facing Application", "Initial Access"],
  ["T1530", "Data from Cloud Storage", "Collection"],
  ["T1078.004", "Valid Accounts: Cloud Accounts", "Persistence"],
  ["T1580", "Cloud Infrastructure Discovery", "Discovery"],
  ["T1552.005", "Cloud Instance Metadata API", "Credential Access"],
];

const DEFEND: [string, string][] = [
  ["D3-NTA", "Network Traffic Analysis"],
  ["D3-ACH", "Application Configuration Hardening"],
  ["D3-CH", "Credential Hardening"],
  ["D3-RAPA", "Resource Access Pattern Analysis"],
  ["D3-EI", "Execution Isolation"],
];

const CONTROLS: [string, string, string, string][] = [
  [
    "SC-7",
    "System & Communications Protection",
    "Boundary Protection",
    "PR.AA",
  ],
  ["AC-3", "Access Control", "Access Enforcement", "PR.AA"],
  ["AC-6", "Access Control", "Least Privilege", "PR.AA"],
  [
    "SC-28",
    "System & Communications Protection",
    "Protection at Rest",
    "PR.DS",
  ],
  ["AU-2", "Audit & Accountability", "Event Logging", "DE.AE"],
  ["CM-2", "Configuration Management", "Baseline Configuration", "PR.IP"],
];

/** `[id, full name, short name, bare reference, requirement]`. */
const FRAMEWORKS: [string, string, string, string, string][] = [
  [
    "CIS-AWS-5.2",
    "CIS AWS Foundations Benchmark",
    "CIS AWS",
    "5.2",
    "No security group allows ingress from 0.0.0.0/0",
  ],
  [
    "PCI-1.3",
    "PCI DSS v4.0",
    "PCI DSS",
    "1.3",
    "Restrict inbound traffic from untrusted networks",
  ],
  [
    "SOC2-CC6.6",
    "SOC 2 Trust Services Criteria",
    "SOC 2",
    "CC6.6",
    "Logical access — external threat mitigation",
  ],
  [
    "ISO-A.13.1",
    "ISO/IEC 27001:2022",
    "ISO 27001",
    "A.13.1",
    "Network security management",
  ],
];

const PROVENANCES: Provenance[] = ["scan", "agent"];

export function buildFindings(a: RemediationAction): LinkedFinding[] {
  const n = Math.min(6, Math.max(1, a.findings % 7));
  return Array.from({ length: n }, (_, i) => {
    const seed = `${a.id}f${i}`;
    return {
      id: `FND-${num(seed, 10000, 99999)}`,
      title: i === 0 ? a.title : pick(TITLES, seed),
      severity: i === 0 ? a.severity : pick(SEVERITIES, seed),
      detector: pick(DETECTORS, `${seed}d`),
      firstSeen: new Date(EPOCH - num(`${seed}s`, 1, 60) * 86400000),
      closes:
        i === 0 || hash(`${seed}c`) % 3 !== 0
          ? ("Full" as const)
          : ("Partial" as const),
      provenance: i === 0 ? "scan" : pick(PROVENANCES, seed),
    };
  });
}

export function buildAssets(a: RemediationAction): LinkedAsset[] {
  const n = Math.min(5, Math.max(1, a.assets % 6));
  return Array.from({ length: n }, (_, i) => {
    const seed = `${a.id}as${i}`;
    return {
      id: `AST-${num(seed, 1000, 9999)}`,
      name:
        i === 0
          ? a.resource
          : `${pick(KINDS, seed).toLowerCase()}-${num(seed, 1000, 9999)}`,
      kind: i === 0 ? "Primary target" : pick(KINDS, `${seed}k`),
      criticality: pick(["Tier 0", "Tier 1", "Tier 2"] as const, `${seed}c`),
      dataClass: pick(
        ["Restricted", "Confidential", "Internal", "Public"] as const,
        `${seed}d`,
      ),
      exposure: a.environment === "prod" ? "Internet-facing" : "Internal only",
    };
  });
}

export function buildControls(a: RemediationAction): LinkedControl[] {
  const n = 3 + (hash(`${a.id}ctl`) % 3);
  return CONTROLS.slice(0, n).map(([id, family, title, csf]) => ({
    id,
    family,
    title,
    csf,
    before: "Fail" as const,
    after: a.stage >= 9 ? ("Pass" as const) : ("Partial" as const),
  }));
}

export function buildFrameworks(a: RemediationAction): LinkedFramework[] {
  return FRAMEWORKS.slice(0, 2 + (hash(`${a.id}fw`) % 3)).map(
    ([id, name, short, ref, requirement]) => {
      const before = num(`${a.id}${id}`, 42, 78);
      return {
        id,
        name,
        short,
        ref,
        requirement,
        coverageBefore: before,
        coverageAfter: Math.min(100, before + num(`${a.id}${id}d`, 8, 22)),
      };
    },
  );
}

export function buildAttack(a: RemediationAction): AttackMapping[] {
  const start = hash(`${a.id}o`) % 3;
  const n = 1 + (hash(`${a.id}at`) % 2);
  return ATTACK.slice(start, start + n).map(
    ([technique, techniqueName, tactic]) => ({
      technique,
      techniqueName,
      tactic,
    }),
  );
}

export function buildDefend(a: RemediationAction): DefendMapping[] {
  return buildAttack(a).map((t, i) => {
    const [id, name] = DEFEND[hash(`${a.id}d${i}`) % DEFEND.length];
    return { id, name, counters: t.technique };
  });
}

/* ------------------------------------------------------------------ *
 * Lifecycle stage spine
 * ------------------------------------------------------------------ */

export type GateStatus = "Passed" | "Open" | "Blocked" | "Not reached";

/**
 * The common spine every stage carries.
 *
 * Without it the ten stages are ten unrelated field lists and cannot be
 * compared — an operator cannot ask "which stage is blocked and who owns it"
 * of a structure where every stage describes itself differently.
 */
export interface StageDetail {
  entry: string;
  exit: string;
  owner: "Agent" | "Human" | "Platform";
  artifact: string;
  gate: GateStatus;
  duration: string;
  provenance: Provenance;
  startedAt?: Date;
}

const STAGE_OWNER: StageDetail["owner"][] = [
  "Agent",
  "Agent",
  "Agent",
  "Agent",
  "Agent",
  "Agent",
  "Platform",
  "Platform",
  "Agent",
  "Human",
];

const STAGE_ARTIFACT = [
  "Detection record",
  "Triage note",
  "Risk score sheet",
  "Investigation report",
  "Blast radius simulation",
  "Change proposal",
  "Run log",
  "Result diff",
  "Validation report",
  "Closure report",
];

export function stageDetail(a: RemediationAction, index: number): StageDetail {
  const seed = `${a.id}st${index}`;
  const n = index + 1;
  const owner = STAGE_OWNER[index];

  let gate: GateStatus = "Not reached";
  if (n < a.stage) gate = "Passed";
  else if (n === a.stage)
    gate = a.status === "Pending approval" ? "Blocked" : "Open";

  let provenance: Provenance = "agent";
  if (owner === "Human") provenance = "human";
  else if (owner === "Platform") provenance = "integration";

  return {
    entry:
      n === 1
        ? "Detector raised a finding"
        : `Stage ${n - 1} exit criteria met`,
    exit:
      n === 10
        ? "Closure report signed and evidence bundled"
        : `${STAGE_ARTIFACT[index]} produced and gate ${n} cleared`,
    owner,
    artifact: STAGE_ARTIFACT[index],
    gate,
    duration: n <= a.stage ? `${num(seed, 4, 96)} min` : "—",
    provenance,
    startedAt:
      n <= a.stage
        ? new Date(EPOCH - (a.stage - n + 1) * num(seed, 2, 20) * 3600000)
        : undefined,
  };
}

/* ------------------------------------------------------------------ *
 * Activity — ONE merged timeline
 * ------------------------------------------------------------------ */

export type ActorType = "Human" | "Agent" | "System";

export interface ActivityEvent {
  id: string;
  at: Date;
  actorType: ActorType;
  actor: string;
  action: string;
  target: string;
  correlationId: string;
  /** Agent entries carry what they did and why. */
  detail?: string;
  toolCall?: string;
}

type RawEvent = [ActorType, string, string, string, string?, string?];

export function buildActivity(a: RemediationAction): ActivityEvent[] {
  const loc = locationOf(a);
  const base: RawEvent[] = [
    ["System", "cspm-scanner", "Raised finding", loc.resource],
    [
      "Agent",
      "cloudguard-agent",
      "Enriched context",
      `${a.assets} assets`,
      "Queried inventory and the IAM graph through the context broker. Holds no cloud credentials.",
      "kb.query(control=SC-7) · graph.neighbours(resource)",
    ],
    [
      "Agent",
      "cloudguard-agent",
      "Assessed risk",
      `score ${a.riskBefore}`,
      "Scored with risk model v3.2. Factors: exposure, data classification, exploitability.",
    ],
    [
      "Agent",
      "cloudguard-agent",
      "Ran blast radius simulation",
      loc.resource,
      "Simulated against a captured environment fingerprint. Reachability delta computed from the dependency graph.",
      "simulate.blast_radius(target)",
    ],
    [
      "Agent",
      "cloudguard-agent",
      "Proposed remediation plan",
      a.auto ? "automated path" : "manual path",
      "Selected from the operation catalog. Two alternatives considered and rejected.",
      "catalog.propose(operation)",
    ],
    [
      "System",
      "policy-engine",
      "Evaluated policy",
      a.environment,
      `Gate applied: ${a.environment === "prod" ? "production two-person rule" : "standard track"}.`,
    ],
    ["Human", a.owner, "Reviewed proposal", a.id],
  ];

  if (a.stage >= 7)
    base.push(["Human", a.owner, "Approved Phase 3 · Apply", loc.resource]);
  if (a.stage >= 8)
    base.push([
      "System",
      "executor",
      "Applied change",
      loc.path,
      "Executed with just-in-time credentials scoped to the approved target.",
    ]);
  if (a.stage >= 9)
    base.push(["System", "cspm-scanner", "Rescan complete", "0 findings"]);
  if (a.stage >= 10) base.push(["Human", a.owner, "Closed action", a.id]);

  return base
    .map(([actorType, actor, action, target, detail, toolCall], i) => ({
      id: `${a.id}-ev${i}`,
      at: new Date(EPOCH - (base.length - i) * 47 * 60000),
      actorType,
      actor,
      action,
      target,
      correlationId: `${a.id}-${String(i).padStart(3, "0")}`,
      detail,
      toolCall,
    }))
    .reverse();
}

/* ------------------------------------------------------------------ *
 * Evidence — integrity first
 * ------------------------------------------------------------------ */

export interface EvidenceItem {
  id: string;
  name: string;
  type: string;
  source: string;
  sha256: string;
  bytes: number;
  collectedAt: Date;
  collector: string;
  chainIndex: number;
  retention: string;
  legalHold: boolean;
  redacted: boolean;
}

/**
 * Deterministic 64-hex.
 *
 * A demo digest, but real-SHAPED: an evidence list whose hashes are obviously
 * fake teaches reviewers to ignore the column, which is the one column that
 * makes evidence evidence. Replaced by a real SHA-256 when the VFS supplies it.
 */
export function digest(seed: string): string {
  let out = "";
  for (let i = 0; out.length < 64; i += 1)
    out += hash(`${seed}:${i}`).toString(16).padStart(8, "0");
  return out.slice(0, 64);
}

const EVIDENCE: [string, string, string][] = [
  ["detection.json", "Scan result", "cspm-scanner"],
  ["blast-radius.json", "Simulation", "simulator"],
  ["terraform.plan.json", "IaC diff", "github"],
  ["cloudtrail-window.jsonl", "Cloud events", "cloudtrail"],
  ["run-log.txt", "Execution log", "executor"],
  ["rescan.json", "Validation report", "cspm-scanner"],
  ["approval-chain.json", "Approval record", "platform"],
];

export function buildEvidence(a: RemediationAction): EvidenceItem[] {
  return EVIDENCE.map(([name, type, source], i) => {
    const seed = `${a.id}ev${i}`;
    return {
      id: `EV-${num(seed, 1000, 9999)}`,
      name,
      type,
      source,
      sha256: digest(seed),
      bytes: num(seed, 900, 480000),
      collectedAt: new Date(EPOCH - num(seed, 1, 120) * 3600000),
      collector: source === "platform" ? "platform" : pick(OWNERS, seed),
      chainIndex: i + 1,
      retention: a.environment === "prod" ? "7 years" : "1 year",
      legalHold: hash(`${seed}lh`) % 11 === 0,
      redacted: name.includes("cloudtrail") || name.includes("run-log"),
    };
  });
}

/* ------------------------------------------------------------------ *
 * Audit
 * ------------------------------------------------------------------ */

export interface AuditEntry {
  index: number;
  at: Date;
  actor: string;
  actorType: ActorType;
  action: string;
  field?: string;
  from?: string;
  to?: string;
  policy?: string;
  hash: string;
  prevHash: string;
}

export interface AccessEntry {
  at: Date;
  actor: string;
  role: string;
  scope: string;
}

type RawAudit = [string, ActorType, string, string?, string?, string?, string?];

export function buildAudit(a: RemediationAction): AuditEntry[] {
  const rows: RawAudit[] = [
    ["cspm-scanner", "System", "Record created"],
    [
      "cloudguard-agent",
      "Agent",
      "Field updated",
      "riskScore",
      "—",
      String(a.riskBefore),
      "risk-model@3.2",
    ],
    [
      "cloudguard-agent",
      "Agent",
      "Field updated",
      "plan",
      "—",
      "5 phases",
      "catalog@1.9",
    ],
    [
      "policy-engine",
      "System",
      "Gate applied",
      "authorization",
      "Authorized",
      "Requires approval",
      `gate-${a.environment}@2.4`,
    ],
    [
      a.owner,
      "Human",
      "Approval granted",
      "phase.apply",
      "Requires approval",
      "Approved",
      "two-person@1.0",
    ],
    [
      "executor",
      "System",
      "Execution recorded",
      "status",
      "Approved",
      "Executing",
    ],
  ];

  let prev = digest(`${a.id}genesis`);
  return rows
    .slice(0, Math.max(2, Math.min(6, a.stage)))
    .map(([actor, actorType, action, field, from, to, policy], i) => {
      const h = digest(`${a.id}au${i}${prev}`);
      const entry: AuditEntry = {
        index: i + 1,
        at: new Date(EPOCH - (rows.length - i) * 66 * 60000),
        actor,
        actorType,
        action,
        field,
        from,
        to,
        policy,
        hash: h,
        prevHash: prev,
      };
      prev = h;
      return entry;
    });
}

export function buildAccessLog(a: RemediationAction): AccessEntry[] {
  return Array.from({ length: 4 }, (_, i) => {
    const seed = `${a.id}ac${i}`;
    return {
      at: new Date(EPOCH - num(seed, 1, 200) * 3600000),
      actor: pick(OWNERS, seed),
      role: pick(ROLES, `${seed}r`),
      scope: i === 0 ? "Full record" : "Evidence only",
    };
  }).sort((x, y) => y.at.getTime() - x.at.getTime());
}

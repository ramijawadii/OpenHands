/**
 * The event model behind the Overview's recent-events table and its detail
 * drawer.
 *
 * The grid shows five columns; the drawer has to answer "what do I do about
 * this?", which needs a great deal more. Rather than bolt those fields onto the
 * grid row ad hoc, the whole record lives here, grouped the way an operator
 * triages: what fired, what it hit, how sure we are, what it costs if ignored,
 * what proves it, and who owns the fix.
 *
 * Values are generated deterministically from the row index — the same event
 * renders identically across reloads, so a screenshot or a copied detail block
 * stays valid. No backend yet; the shape is what a connector would fill.
 */

export const EVENT_TYPES = ["Normal", "Alert", "Incident"] as const;
export const ENVIRONMENTS = ["prod", "staging", "dev"] as const;
export const KINDS = [
  "Instance",
  "Bucket",
  "Database",
  "Function",
  "LoadBalancer",
];

export const SERVICE_OF: Record<string, string> = {
  Instance: "Compute",
  Bucket: "Storage",
  Database: "Database",
  Function: "Serverless",
  LoadBalancer: "Networking",
};

/** Event severity maps onto the inventory's severity scale. */
export const SEVERITY_OF: Record<string, string> = {
  Normal: "Low",
  Alert: "Medium",
  Incident: "Critical",
};

export type EventType = (typeof EVENT_TYPES)[number];
export type EventEnv = (typeof ENVIRONMENTS)[number];

export interface TimelineEntry {
  at: Date;
  label: string;
}

export interface LogLine {
  at: Date;
  level: "info" | "warn" | "error";
  source: string;
  message: string;
}

export interface HistoryEntry {
  at: Date;
  actor: string;
  actorType: "agent" | "human";
  action: string;
}

export interface Comment {
  at: Date;
  who: string;
  text: string;
}

export interface EventRow {
  /* Identification */
  id: string;
  at: Date;
  type: EventType;
  /** Descriptive event name — "Storage Bucket Outage", not "bucket-1001". */
  title: string;
  message: string;
  status: "Open" | "Acknowledged" | "Suppressed" | "Resolved";

  /* Affected resource */
  env: EventEnv;
  kind: string;
  serviceType: string;
  resource: string;
  resourceId: string;
  provider: string;
  account: string;
  region: string;
  owner: string;

  /* Detection */
  detector: string;
  ruleId: string;
  confidence: number;
  occurrences: number;
  firstSeen: Date;

  /* Impact */
  blastRadius: number;
  affectedResources: number;
  businessImpact: string;
  internetFacing: boolean;
  dataClassification: string;
  compliance: string[];

  /* Detection reasoning */
  mitreTactic: string;
  mitreTechnique: string;
  mitreId: string;
  detectionLogic: string;
  falsePositive: string;
  relatedFindings: string[];

  /* Evidence */
  evidence: string;
  logRef: string;
  fingerprint: string;
  logs: LogLine[];
  telemetry: [string, string][];
  cloudEvents: LogLine[];
  apiCalls: [string, string][];

  /* Response */
  assignee: string;
  escalation: string;
  slaDue: Date;
  ticket: string | null;
  /** Ordered playbook steps — the "what do I do next" answer. */
  recommendations: string[];
  recommendation: string;
  runbook: string;
  playbook: string;
  automation: string;
  timeline: TimelineEntry[];
  history: HistoryEntry[];
  comments: Comment[];
}

const MESSAGES: Record<EventType, string[]> = {
  Normal: [
    "Configuration applied",
    "Scan completed",
    "Tag policy satisfied",
    "Backup finished",
    "Instance started",
  ],
  Alert: [
    "Public ingress detected",
    "Encryption disabled",
    "Drift from IaC baseline",
    "Owner tag missing",
    "Certificate expiring",
  ],
  Incident: [
    "Credentials exposed in code",
    "Unrestricted 0.0.0.0/0 rule",
    "Privilege escalation path",
    "Data store publicly listable",
    "Outage — service unreachable",
  ],
};

/** What to do about it, keyed by the finding — not generic filler. */
const RECOMMENDATION: Record<string, string> = {
  "Public ingress detected":
    "Restrict the security group to the corporate CIDR and re-scan.",
  "Encryption disabled": "Enable encryption at rest, then rotate the data key.",
  "Drift from IaC baseline":
    "Re-apply the Terraform plan or import the manual change.",
  "Owner tag missing": "Set the `owner` tag from the service catalogue.",
  "Certificate expiring": "Renew and redeploy before the SLA date below.",
  "Credentials exposed in code":
    "Revoke the key, rotate the secret, purge it from history.",
  "Unrestricted 0.0.0.0/0 rule": "Replace the open rule with scoped ingress.",
  "Privilege escalation path":
    "Remove the wildcard action from the attached policy.",
  "Data store publicly listable":
    "Block public access at the account level, then per bucket.",
  "Outage — service unreachable":
    "Fail over to the standby, then capture the post-incident review.",
  "Configuration applied": "No action — recorded for the audit trail.",
  "Scan completed": "No action — evidence retained for compliance.",
  "Tag policy satisfied": "No action.",
  "Backup finished": "No action — verify the next restore test on schedule.",
  "Instance started": "No action.",
};

/**
 * A descriptive event name, built from the finding and the kind of thing it
 * happened to — "Storage Bucket Outage", never "bucket-1001".
 *
 * A resource identifier is not an event name: it says what was involved, not
 * what happened, and a triage queue full of identifiers is unreadable. The
 * kind supplies the noun, the finding supplies the verb.
 */
const KIND_NOUN: Record<string, string> = {
  Instance: "Virtual Machine",
  Bucket: "Storage Bucket",
  Database: "Database",
  Function: "Serverless Function",
  LoadBalancer: "Load Balancer",
};

const TITLE_SUFFIX: Record<string, string> = {
  "Public ingress detected": "Publicly Exposed",
  "Encryption disabled": "Encryption Disabled",
  "Drift from IaC baseline": "Configuration Drift",
  "Owner tag missing": "Ownership Unassigned",
  "Certificate expiring": "Certificate Expiring",
  "Credentials exposed in code": "Credentials Exposed",
  "Unrestricted 0.0.0.0/0 rule": "Unrestricted Ingress",
  "Privilege escalation path": "Privilege Escalation Path",
  "Data store publicly listable": "Publicly Listable",
  "Outage — service unreachable": "Outage",
  "Configuration applied": "Configuration Applied",
  "Scan completed": "Scan Completed",
  "Tag policy satisfied": "Tag Policy Satisfied",
  "Backup finished": "Backup Completed",
  "Instance started": "Started",
};

/** ATT&CK mapping per finding — the tactic answers "why does this matter". */
const MITRE: Record<string, [string, string, string]> = {
  "Public ingress detected": [
    "Initial Access",
    "Exploit Public-Facing Application",
    "T1190",
  ],
  "Encryption disabled": ["Collection", "Data from Cloud Storage", "T1530"],
  "Drift from IaC baseline": [
    "Defense Evasion",
    "Modify Cloud Compute",
    "T1578",
  ],
  "Owner tag missing": ["Discovery", "Cloud Service Discovery", "T1526"],
  "Certificate expiring": [
    "Credential Access",
    "Steal Web Session Cookie",
    "T1539",
  ],
  "Credentials exposed in code": [
    "Credential Access",
    "Unsecured Credentials",
    "T1552",
  ],
  "Unrestricted 0.0.0.0/0 rule": [
    "Initial Access",
    "External Remote Services",
    "T1133",
  ],
  "Privilege escalation path": [
    "Privilege Escalation",
    "Valid Accounts: Cloud",
    "T1078.004",
  ],
  "Data store publicly listable": [
    "Collection",
    "Data from Cloud Storage",
    "T1530",
  ],
  "Outage — service unreachable": [
    "Impact",
    "Endpoint Denial of Service",
    "T1499",
  ],
};

/** The rule in words: what condition the detector actually evaluated. */
const LOGIC: Record<string, string> = {
  "Public ingress detected":
    "Any ingress rule whose source is outside the corporate CIDR set, on a port not in the public allowlist.",
  "Encryption disabled":
    "Server-side encryption absent, or the key is provider-managed where the policy requires customer-managed.",
  "Drift from IaC baseline":
    "Live configuration differs from the last applied plan for two consecutive scans.",
  "Owner tag missing":
    "Required tag `owner` absent or not resolvable in the service catalogue.",
  "Certificate expiring":
    "Certificate `notAfter` falls inside the renewal window of 30 days.",
  "Credentials exposed in code":
    "High-entropy string matching a provider key format, found in a tracked file and verified live.",
  "Unrestricted 0.0.0.0/0 rule":
    "Ingress rule with source 0.0.0.0/0 on an administrative port.",
  "Privilege escalation path":
    "Reachable path from this principal to a role granting a wildcard action.",
  "Data store publicly listable":
    "Anonymous list permission granted at bucket or account level.",
  "Outage — service unreachable":
    "Health heartbeat missing from monitoring for more than five minutes.",
};

const FALSE_POSITIVE: Record<string, string> = {
  "Public ingress detected":
    "Expected on deliberately public endpoints — confirm against the exposure allowlist before closing.",
  "Encryption disabled":
    "Rare. Non-sensitive scratch data may be exempt if a documented waiver exists.",
  "Drift from IaC baseline":
    "Common during an in-flight deploy; re-check after the pipeline settles.",
  "Owner tag missing":
    "Newly created resources may not be tagged yet — allow one reconciliation cycle.",
  "Certificate expiring": "Not a false positive; only the urgency varies.",
  "Credentials exposed in code":
    "Test fixtures and rotated keys trigger this; verify the key is live before escalating.",
  "Unrestricted 0.0.0.0/0 rule":
    "Load balancers front-ending public services are expected — check the attached target.",
  "Privilege escalation path":
    "Break-glass roles are expected to be powerful; confirm the path is not the documented one.",
  "Data store publicly listable":
    "Static website buckets are intentionally public — check for a website configuration.",
  "Outage — service unreachable":
    "Monitoring gaps look identical to outages; confirm the collector was healthy.",
};

/** Ordered response steps — what to actually do, in order. */
const PLAYBOOK: Record<string, string[]> = {
  "Outage — service unreachable": [
    "Verify the service health endpoint directly, bypassing monitoring.",
    "Check authentication and dependency failures in the same window.",
    "Review the last configuration change to the resource.",
    "Fail over to the standby, or roll back the recent change.",
    "Notify the service owner and open the post-incident review.",
  ],
  "Public ingress detected": [
    "Confirm the exposure from outside the network.",
    "Identify what the rule was added for, and by whom.",
    "Scope the rule to the corporate CIDR set.",
    "Re-scan to confirm the exposure is closed.",
    "Record a waiver if the exposure is intended.",
  ],
  "Credentials exposed in code": [
    "Revoke the exposed credential immediately.",
    "Rotate the secret and update every consumer.",
    "Purge the value from version-control history.",
    "Review access logs for use of the credential.",
    "Add the pattern to pre-commit scanning.",
  ],
};

const DEFAULT_PLAYBOOK = [
  "Confirm the finding against the live resource.",
  "Identify the owning team and assign the work.",
  "Apply the recommended remediation.",
  "Re-scan to verify the finding no longer reproduces.",
  "Record the outcome, or a waiver with an expiry.",
];

const BUSINESS_IMPACT: Record<string, string> = {
  prod: "Production authentication and customer traffic",
  staging: "Pre-production validation and release gating",
  dev: "Developer productivity only",
};

const AUTOMATIONS: Record<string, string> = {
  "Outage — service unreachable": "Restart service and fail over",
  "Public ingress detected": "Scope ingress to corporate CIDR",
  "Encryption disabled": "Enable encryption at rest",
  "Credentials exposed in code": "Revoke and rotate credential",
};

const TELEMETRY_KEYS = [
  "cpu.utilisation",
  "mem.working_set",
  "net.ingress_bps",
  "http.5xx_rate",
  "auth.failure_rate",
];

const API_CALLS = [
  "GetBucketPolicyStatus",
  "DescribeSecurityGroups",
  "ListAttachedRolePolicies",
  "GetMetricStatistics",
  "DescribeInstanceHealth",
];

const DETECTORS = [
  "Posture scanner",
  "Runtime sensor",
  "IaC drift engine",
  "Log correlator",
  "CSPM baseline",
];
const PROVIDERS = ["AWS", "Azure", "GCP"];
const REGIONS = ["eu-west-1", "us-east-1", "eu-central-1", "ap-south-1"];
const OWNERS = ["platform", "payments", "data-eng", "identity", "edge"];
const ASSIGNEES = ["unassigned", "a.silva", "k.novak", "m.haddad", "r.okafor"];
const CLASSES = ["Public", "Internal", "Confidential", "Restricted"];
const FRAMEWORKS = ["CIS 1.5", "SOC 2", "PCI DSS", "ISO 27001", "NIST 800-53"];
/** Hours to breach, by severity — incidents get hours, alerts get days. */
const SLA_HOURS: Record<EventType, number> = {
  Incident: 4,
  Alert: 72,
  Normal: 720,
};

const STATUSES: EventRow["status"][] = [
  "Open",
  "Acknowledged",
  "Suppressed",
  "Resolved",
];

/** Deterministic, so the list is stable across renders and reloads. */
function rand(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function pick<T>(arr: readonly T[], seed: number): T {
  return arr[Math.floor(rand(seed) * arr.length) % arr.length];
}

function int(seed: number, min: number, max: number): number {
  return min + Math.floor(rand(seed) * (max - min + 1));
}

/** Weighted so the feed looks like a real estate, not a permanent outage. */
function severityFor(r: number): EventType {
  if (r > 0.88) return "Incident";
  if (r > 0.6) return "Alert";
  return "Normal";
}

/** Hex fingerprint from the seed — stable, and looks like the real thing. */
function fingerprint(seed: number): string {
  let out = "";
  for (let i = 0; i < 8; i += 1) {
    out += Math.floor(rand(seed * 7 + i) * 65536)
      .toString(16)
      .padStart(4, "0");
  }
  return out.slice(0, 32);
}

export function buildEvents(count: number): EventRow[] {
  const now = Date.now();
  const rows: EventRow[] = [];

  for (let i = 0; i < count; i += 1) {
    const type = severityFor(rand(i + 1));
    const kind = pick(KINDS, i + 2);
    // Spread over ~40 days so the date filter has something to bite on.
    const at = new Date(
      now - i * 55 * 60000 - Math.floor(rand(i + 3) * 900000),
    );
    const message = pick(MESSAGES[type], i + 5);
    const account = `${pick(OWNERS, i + 9)}-${int(i + 10, 10, 99)}`;
    const region = pick(REGIONS, i + 11);
    const resource = `${kind.toLowerCase()}-${1000 + i}`;
    const occurrences = type === "Normal" ? 1 : int(i + 14, 2, 47);
    const env = pick(ENVIRONMENTS, i + 4);
    const assignee = type === "Normal" ? "unassigned" : pick(ASSIGNEES, i + 22);
    const mitre = MITRE[message] ?? [
      "Discovery",
      "Cloud Service Discovery",
      "T1526",
    ];
    const detector = pick(DETECTORS, i + 13);
    const blastRadius =
      type === "Incident" ? int(i + 17, 12, 140) : int(i + 17, 0, 24);

    // The response trail runs forward from detection, so each step lands
    // after the one before it rather than at a random time.
    const step = (mins: number) => new Date(at.getTime() + mins * 60000);
    const opened = type === "Normal" ? [] : ["Incident created"];

    rows.push({
      id: `evt-${i + 1}`,
      at,
      type,
      title: `${KIND_NOUN[kind] ?? kind} ${TITLE_SUFFIX[message] ?? message}`,
      message,
      // Resolved events are the long tail; open ones lead.
      status: type === "Normal" ? "Resolved" : pick(STATUSES, i + 6),

      env,
      kind,
      serviceType: SERVICE_OF[kind] ?? "Other",
      resource,
      resourceId: `${account}/${region}/${resource}`,
      provider: pick(PROVIDERS, i + 7),
      account,
      region,
      owner: pick(OWNERS, i + 12),

      detector,
      ruleId: `CG-${String(int(i + 15, 100, 899)).padStart(3, "0")}`,
      confidence:
        type === "Incident" ? int(i + 16, 82, 99) : int(i + 16, 55, 92),
      occurrences,
      // An event that has fired N times started before it was last seen.
      firstSeen: new Date(at.getTime() - occurrences * 36e5),

      blastRadius,
      affectedResources: Math.max(1, Math.round(blastRadius / 2)),
      businessImpact: BUSINESS_IMPACT[env] ?? "Unclassified",
      internetFacing: rand(i + 18) > 0.62,
      dataClassification: pick(CLASSES, i + 19),
      compliance:
        type === "Normal"
          ? []
          : Array.from(
              new Set([pick(FRAMEWORKS, i + 20), pick(FRAMEWORKS, i + 21)]),
            ),

      mitreTactic: mitre[0],
      mitreTechnique: mitre[1],
      mitreId: mitre[2],
      detectionLogic:
        LOGIC[message] ?? "Rule matched the resource's current configuration.",
      falsePositive:
        FALSE_POSITIVE[message] ??
        "Confirm against the live resource before closing.",
      relatedFindings: MESSAGES[type]
        .filter((m) => m !== message)
        .slice(0, 2 + Math.floor(rand(i + 25) * 2)),

      evidence: `${detector} matched ${message.toLowerCase()} on ${resource}`,
      logRef: `cg://logs/${region}/${at.toISOString().slice(0, 10)}/${i + 1}`,
      fingerprint: fingerprint(i + 1),
      logs: [
        {
          at: step(-3),
          level: "info",
          source: detector,
          message: `Evaluating ${resource} against ${message.toLowerCase()}`,
        },
        {
          at: step(0),
          level: type === "Incident" ? "error" : "warn",
          source: detector,
          message: `${message} on ${resource}`,
        },
        {
          at: step(1),
          level: "info",
          source: "correlator",
          message: `Correlated ${occurrences} signal(s), blast radius ${blastRadius}`,
        },
      ],
      telemetry: TELEMETRY_KEYS.slice(0, 3 + Math.floor(rand(i + 26) * 3)).map(
        (k, n) => [
          k,
          `${int(i + 27 + n, 1, 98)}${k.endsWith("rate") ? "%" : ""}`,
        ],
      ),
      cloudEvents: [
        {
          at: step(-14),
          level: "info",
          source: `${pick(PROVIDERS, i + 7)} audit`,
          message: `${pick(API_CALLS, i + 28)} by ${pick(ASSIGNEES, i + 29)}`,
        },
        {
          at: step(-6),
          level: "warn",
          source: `${pick(PROVIDERS, i + 7)} audit`,
          message: `Configuration change applied to ${resource}`,
        },
      ],
      apiCalls: API_CALLS.slice(0, 3).map((c) => [
        c,
        `${int(i + 30, 120, 980)} ms`,
      ]),

      assignee,
      escalation: `${pick(OWNERS, i + 31)} on-call`,
      slaDue: new Date(at.getTime() + SLA_HOURS[type] * 36e5),
      ticket: rand(i + 23) > 0.55 ? `SEC-${int(i + 24, 1000, 9999)}` : null,
      recommendations: PLAYBOOK[message] ?? DEFAULT_PLAYBOOK,
      recommendation: RECOMMENDATION[message] ?? "Triage and assign an owner.",
      runbook: `runbooks/${message.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      playbook: `${KIND_NOUN[kind] ?? kind} ${TITLE_SUFFIX[message] ?? "Response"} playbook`,
      automation: AUTOMATIONS[message] ?? "No automation available",
      timeline: [
        { at, label: "Alert triggered" },
        ...opened.map((label, n) => ({ at: step(n + 1), label })),
        ...(assignee === "unassigned"
          ? []
          : [{ at: step(2), label: `Assigned to ${assignee}` }]),
        ...(type === "Normal"
          ? [{ at: step(4), label: "Closed automatically" }]
          : [{ at: step(4), label: "Investigation started" }]),
      ],
      history: [
        {
          at: step(1),
          actor: detector,
          actorType: "agent",
          action: "Detected and triaged the finding",
        },
        {
          at: step(3),
          actor: "correlation-agent",
          actorType: "agent",
          action: "Correlated blast radius and reachability",
        },
        ...(assignee === "unassigned"
          ? []
          : [
              {
                at: step(6),
                actor: assignee,
                actorType: "human" as const,
                action: "Acknowledged and began investigation",
              },
            ]),
      ],
      comments:
        rand(i + 32) > 0.5
          ? [
              {
                at: step(8),
                who: assignee,
                text: "Confirmed against the live resource — proceeding with the playbook.",
              },
            ]
          : [],
    });
  }

  return rows;
}

function scalar(v: unknown): string {
  if (v instanceof Date) return v.toISOString();
  if (Array.isArray(v)) return v.join(", ");
  return String(v);
}

/** Flat key/value text for the clipboard — one field per line. */
export function eventAsText(e: EventRow): string {
  return Object.entries(e)
    .map(([k, v]) => `${k}\t${scalar(v)}`)
    .join("\n");
}

/** Stable reference pasted into the chat composer. */
export function eventAskReference(e: EventRow): string {
  return `${e.type} \`${e.message}\` on ${e.kind} \`${e.resource}\` (event: \`${e.id}\`, rule: \`${e.ruleId}\`) — `;
}

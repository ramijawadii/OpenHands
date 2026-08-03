import type { EventRow } from "./event-data";

/**
 * The reconstruction behind the Attack Timeline canvas.
 *
 * Each ATT&CK phase carries not just a time range but the things an analyst
 * needs before acting on it: how confident the reconstruction is, what
 * evidence supports it, which assets and identities were involved, and what to
 * do next. A bar with no provenance is a guess presented as a fact, and this
 * timeline is explicitly a *reconstruction* — most of it is inferred.
 *
 * Values are derived deterministically from the event, so the same incident
 * reconstructs identically every time it is opened. There is no correlation
 * engine yet; this is the shape one would fill.
 */

/** Attack order, never alphabetical: the sequence is the meaning. */
export const PHASES = [
  "Reconnaissance",
  "Initial access",
  "Execution",
  "Persistence",
  "Privilege escalation",
  "Lateral movement",
  "Collection",
  "Exfiltration",
] as const;

export type PhaseName = (typeof PHASES)[number];

/**
 * How much the reconstruction trusts a phase.
 *
 * `Confirmed` means direct evidence; `Likely` means corroborating signals
 * without a primary artifact; `Inferred` means the phase is required for the
 * next one to have happened; `No evidence` means nothing was found and the
 * phase is drawn only to keep the sequence honest about its gaps.
 */
export type PhaseStatus = "Confirmed" | "Likely" | "Inferred" | "No evidence";

export interface EvidenceGroup {
  label: string;
  count: number;
}

export interface Outlier {
  phase: PhaseName;
  /** Minutes before detection. */
  minutes: number;
  title: string;
  confidence: number;
  reason: string;
}

export interface Phase {
  name: PhaseName;
  index: number;
  /** Minutes before detection — larger is earlier. */
  start: number;
  q1: number;
  median: number;
  q3: number;
  end: number;
  durationMinutes: number;
  status: PhaseStatus;
  confidence: number;
  evidenceCount: number;
  evidence: EvidenceGroup[];
  mitreId: string;
  mitreTechnique: string;
  assets: string[];
  users: string[];
  processes: string[];
  sources: string[];
  summary: string;
  recommendation: string;
  relatedFindings: string[];
}

export interface Reconstruction {
  phases: Phase[];
  outliers: Outlier[];
  detectionAt: Date;
  /** Weighted mean of per-phase confidence — the whole chain's credibility. */
  confidence: number;
  eventsCorrelated: number;
  sources: string[];
  generatedAt: Date;
}

const MITRE_BY_PHASE: Record<PhaseName, [string, string]> = {
  Reconnaissance: ["T1595", "Active Scanning"],
  "Initial access": ["T1190", "Exploit Public-Facing Application"],
  Execution: ["T1059", "Command and Scripting Interpreter"],
  Persistence: ["T1136", "Create Account"],
  "Privilege escalation": ["T1078.004", "Valid Accounts: Cloud"],
  "Lateral movement": ["T1021", "Remote Services"],
  Collection: ["T1530", "Data from Cloud Storage"],
  Exfiltration: ["T1567", "Exfiltration Over Web Service"],
};

const SUMMARY_BY_PHASE: Record<PhaseName, string> = {
  Reconnaissance:
    "External scanning of the account's public surface, concentrated on the affected service.",
  "Initial access":
    "Access obtained through the exposed entry point identified during scanning.",
  Execution:
    "Commands executed on the compromised host from a privileged context.",
  Persistence:
    "A durable foothold established so access survives credential rotation.",
  "Privilege escalation":
    "A role with wider permissions assumed from the initial principal.",
  "Lateral movement":
    "Adjacent workloads reached using the escalated credentials.",
  Collection: "Data staged from the affected store before transfer.",
  Exfiltration: "Staged data transferred out over an allowed egress path.",
};

const RECOMMENDATION_BY_PHASE: Record<PhaseName, string> = {
  Reconnaissance: "Review edge logs for the scanning source and block it.",
  "Initial access": "Close the entry point and rotate anything it exposed.",
  Execution: "Isolate the host and capture volatile state before reboot.",
  Persistence: "Enumerate and remove created principals and scheduled tasks.",
  "Privilege escalation": "Revoke the assumed role and audit its trust policy.",
  "Lateral movement": "Segment the reached workloads and re-scan each one.",
  Collection: "Identify what was staged and classify the exposure.",
  Exfiltration: "Confirm the destination and begin the disclosure assessment.",
};

const SOURCE_POOL = ["CloudTrail", "Defender", "EDR", "Identity", "Network"];

const EVIDENCE_LABELS = [
  "Logs",
  "Cloud events",
  "Identity events",
  "Network events",
  "EDR alerts",
];

/** Deterministic stream, seeded per event so a report never shifts. */
function seeded(text: string): () => number {
  let h = 0;
  for (let i = 0; i < text.length; i += 1) {
    h = (h * 31 + text.charCodeAt(i)) % 2147483647;
  }
  return () => {
    h = (h * 16807) % 2147483647;
    return h / 2147483647;
  };
}

function statusFor(confidence: number, evidenceCount: number): PhaseStatus {
  if (evidenceCount === 0) return "No evidence";
  if (confidence >= 85) return "Confirmed";
  if (confidence >= 65) return "Likely";
  return "Inferred";
}

/** Percentage → the label an analyst actually says out loud. */
export function confidenceLabel(pct: number): string {
  if (pct >= 90) return "Very high";
  if (pct >= 75) return "High";
  if (pct >= 50) return "Medium";
  return "Low";
}

export function formatDuration(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (h < 24) return rem ? `${h}h ${rem}m` : `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h`;
}

/** "10h 45m before detection" — the axis is relative, so labels are too. */
export function beforeDetection(minutes: number): string {
  return `${formatDuration(minutes)} before detection`;
}

export function buildReconstruction(e: EventRow): Reconstruction {
  const rand = seeded(`${e.id}:timeline`);
  const phases: Phase[] = [];
  const outliers: Outlier[] = [];

  PHASES.forEach((name, i) => {
    // Earlier phases sit further from detection and spread wider:
    // reconnaissance is noisy and long, exfiltration is late and sharp.
    const distance = (PHASES.length - i) * 90;
    const spread = 30 + (PHASES.length - i) * 22;
    const median = distance + rand() * spread * 0.4;
    const q1 = median - spread * (0.3 + rand() * 0.3);
    const q3 = median + spread * (0.3 + rand() * 0.3);
    const start = q3 + spread * (0.4 + rand() * 0.6);
    const end = Math.max(0, q1 - spread * (0.4 + rand() * 0.5));

    // Confidence decays backwards through the chain: the further from the
    // detected event, the more of the phase is reasoned rather than observed.
    const base = e.confidence - i * 4 + rand() * 14;
    const confidence = Math.max(18, Math.min(99, Math.round(base)));
    const evidenceCount =
      confidence < 30 && rand() > 0.6 ? 0 : 3 + Math.floor(rand() * 40);

    const evidence: EvidenceGroup[] = EVIDENCE_LABELS.map((label) => ({
      label,
      count: Math.floor(rand() * Math.max(1, evidenceCount / 2)),
    })).filter((g) => g.count > 0);

    const [mitreId, mitreTechnique] = MITRE_BY_PHASE[name];
    const hosts = 1 + Math.floor(rand() * 3);

    phases.push({
      name,
      index: i,
      start: Math.round(start),
      q1: Math.round(q1),
      median: Math.round(median),
      q3: Math.round(q3),
      end: Math.round(end),
      durationMinutes: Math.round(start - end),
      status: statusFor(confidence, evidenceCount),
      confidence,
      evidenceCount,
      evidence,
      mitreId,
      mitreTechnique,
      assets: Array.from(
        { length: hosts },
        (_, n) => `${e.kind.toLowerCase()}-${1000 + i * 3 + n}`,
      ),
      users: [e.assignee === "unassigned" ? "svc-admin" : e.assignee].concat(
        rand() > 0.6 ? ["svc-deploy"] : [],
      ),
      processes:
        rand() > 0.5 ? ["powershell.exe", "az.cli"] : ["python3", "aws-cli"],
      sources: SOURCE_POOL.filter(() => rand() > 0.45).slice(0, 3),
      summary: SUMMARY_BY_PHASE[name],
      recommendation: RECOMMENDATION_BY_PHASE[name],
      relatedFindings: e.relatedFindings.slice(0, 2),
    });

    if (rand() > 0.62) {
      outliers.push({
        phase: name,
        minutes: Math.round(start + spread * (0.8 + rand())),
        title: `Unexpected ${name.toLowerCase()} signal`,
        confidence: 60 + Math.floor(rand() * 35),
        reason: `Observed outside the estimated ${name.toLowerCase()} window.`,
      });
    }
  });

  const eventsCorrelated = phases.reduce((a, p) => a + p.evidenceCount, 0);
  // Weighted by evidence: a confident phase backed by two events should not
  // pull the whole reconstruction's credibility up.
  const weighted = phases.reduce(
    (a, p) => a + p.confidence * p.evidenceCount,
    0,
  );

  return {
    phases,
    outliers,
    detectionAt: e.at,
    confidence: eventsCorrelated ? Math.round(weighted / eventsCorrelated) : 0,
    eventsCorrelated,
    sources: Array.from(new Set(phases.flatMap((p) => p.sources))).sort(),
    generatedAt: new Date(),
  };
}

import {
  EPOCH,
  hash,
  num,
  pick,
  type Provenance,
  type RemediationAction,
} from "./remediation-data";
import { digest, stageFieldValue } from "./remediation-detail-data";
import { LIFECYCLE_STAGES, slug } from "./remediation-structure";

/**
 * Per-stage control references, and per-field detail.
 *
 * Two things the lifecycle card was missing:
 *
 * **Which control a stage evidences.** A stage is not just work — it is the
 * thing an auditor points at when asking "how do you know you assessed risk".
 * Naming the control on the stage makes the record self-justifying instead of
 * requiring someone to remember the mapping.
 *
 * **What a field actually holds.** A field row showed a one-line value with no
 * way to reach what produced it. The value is a summary of an artifact; the
 * artifact is the evidence. Every field is now openable.
 */

export interface ControlRef {
  framework: string;
  ref: string;
  title: string;
}

/**
 * Stage → the controls it evidences.
 *
 * Fixed, not generated: the mapping from "what this stage does" to "which
 * control that satisfies" is a property of the workflow. Generating it per
 * action would produce citations nobody could verify.
 */
export const STAGE_CONTROLS: ControlRef[][] = [
  /* 1 Discovery */
  [
    {
      framework: "NIST CSF",
      ref: "DE.CM",
      title: "Detect · Continuous Monitoring",
    },
    {
      framework: "NIST SP 800-53",
      ref: "RA-5",
      title: "Vulnerability Monitoring & Scanning",
    },
    {
      framework: "CIS AWS",
      ref: "4.1",
      title: "Ensure detection controls are enabled",
    },
  ],
  /* 2 Triage */
  [
    {
      framework: "NIST CSF",
      ref: "ID.AM",
      title: "Identify · Asset Management",
    },
    {
      framework: "NIST SP 800-53",
      ref: "CM-8",
      title: "System Component Inventory",
    },
  ],
  /* 3 Risk Assessment */
  [
    {
      framework: "NIST CSF",
      ref: "ID.RA",
      title: "Identify · Risk Assessment",
    },
    { framework: "NIST SP 800-53", ref: "RA-3", title: "Risk Assessment" },
  ],
  /* 4 Investigation */
  [
    {
      framework: "MITRE ATT&CK",
      ref: "T1190",
      title: "Exploit Public-Facing Application",
    },
    { framework: "NIST SP 800-53", ref: "IR-4", title: "Incident Handling" },
  ],
  /* 5 Blast Radius */
  [
    {
      framework: "MITRE D3FEND",
      ref: "D3-RAPA",
      title: "Resource Access Pattern Analysis",
    },
    { framework: "NIST SP 800-53", ref: "CA-3", title: "Information Exchange" },
  ],
  /* 6 Plan */
  [
    {
      framework: "NIST CSF",
      ref: "PR.IP",
      title: "Protect · Information Protection Processes",
    },
    {
      framework: "NIST SP 800-53",
      ref: "CM-3",
      title: "Configuration Change Control",
    },
  ],
  /* 7 Execution */
  [
    {
      framework: "MITRE D3FEND",
      ref: "D3-ACH",
      title: "Application Configuration Hardening",
    },
    {
      framework: "NIST SP 800-53",
      ref: "CM-6",
      title: "Configuration Settings",
    },
  ],
  /* 8 Results */
  [
    { framework: "NIST SP 800-53", ref: "CM-4", title: "Impact Analyses" },
    { framework: "NIST CSF", ref: "RS.MI", title: "Respond · Mitigation" },
  ],
  /* 9 Validation */
  [
    {
      framework: "NIST CSF",
      ref: "DE.CM",
      title: "Detect · Continuous Monitoring",
    },
    {
      framework: "NIST SP 800-53",
      ref: "CA-7",
      title: "Continuous Monitoring",
    },
  ],
  /* 10 Closure */
  [
    {
      framework: "NIST CSF",
      ref: "RC.RP",
      title: "Recover · Recovery Plan Execution",
    },
    { framework: "NIST SP 800-53", ref: "IR-6", title: "Incident Reporting" },
  ],
];

/* ------------------------------------------------------------------ *
 * Field detail
 * ------------------------------------------------------------------ */

export interface FieldRow {
  label: string;
  value: string;
  mono?: boolean;
}

export interface FieldDetail {
  stage: number;
  stageLabel: string;
  field: string;
  /** The one-line value the stage card shows. */
  value: string;
  provenance: Provenance;
  /** Where the value came from and how — the audit question. */
  derivation: FieldRow[];
  /** The raw record behind the summary. Exportable. */
  payload: Record<string, unknown>;
  /** Evidence artifact this field is drawn from, when there is one. */
  artifact?: { name: string; sha256: string; bytes: number };
  controls: ControlRef[];
  /** Structured payloads export cleanly; prose does not. */
  exportable: boolean;
}

const METHODS: Record<Provenance, string> = {
  scan: "Deterministic scan — reproducible from the same inputs",
  agent: "Model inference — carries confidence, not certainty",
  human: "Asserted by a named person",
  integration: "Imported from a connected system",
};

/**
 * Which artifact a stage's fields are drawn from.
 *
 * The stage already declares an artifact name; this is the same list, so a
 * field, its stage and the Evidence pane all point at one file rather than
 * three plausible-looking names.
 */
const STAGE_ARTIFACT: (string | null)[] = [
  "detection.json",
  null,
  "risk-score.json",
  "investigation.json",
  "blast-radius.json",
  "terraform.plan.json",
  "run-log.txt",
  "result-diff.json",
  "rescan.json",
  "closure-report.json",
];

/** Who produced the value, by provenance. A lookup, not a ternary chain. */
function sourceFor(p: Provenance, seed: string, owner: string): string {
  if (p === "scan")
    return pick(["cspm-scanner", "iam-analyzer", "config-drift"], seed);
  if (p === "agent") return "cloudguard-agent";
  if (p === "integration") return pick(["github", "executor", "jira"], seed);
  return owner;
}

export function buildFieldDetail(
  action: RemediationAction,
  stageIndex: number,
  field: string,
): FieldDetail {
  const seed = `${action.id}:st${stageIndex}:${slug(field)}`;
  const stage = LIFECYCLE_STAGES[stageIndex];
  const value = stageFieldValue(action, stageIndex, field) ?? "—";

  // Owner of the stage decides how the value was asserted.
  const owners: Provenance[] = [
    "scan",
    "agent",
    "agent",
    "agent",
    "agent",
    "agent",
    "integration",
    "integration",
    "scan",
    "human",
  ];
  const provenance = owners[stageIndex] ?? "agent";
  const artifactName = STAGE_ARTIFACT[stageIndex];

  const recordedAt = new Date(EPOCH - num(seed, 1, 72) * 3600000).toISOString();

  return {
    stage: stageIndex + 1,
    stageLabel: stage.label,
    field,
    value,
    provenance,

    derivation: [
      { label: "Method", value: METHODS[provenance] },
      {
        label: "Source",
        value: sourceFor(provenance, seed, action.owner),
        mono: true,
      },
      {
        label: "Recorded at",
        value: recordedAt.replace("T", " ").slice(0, 19),
      },
      {
        label: "Confidence",
        value:
          provenance === "agent"
            ? `${(0.7 + (hash(seed) % 30) / 100).toFixed(2)}`
            : "n/a — deterministic",
      },
      {
        label: "Reproducible",
        value: provenance === "scan" ? "Yes — re-run the detector" : "No",
      },
      { label: "Field key", value: `${stage.id}.${slug(field)}`, mono: true },
    ],

    payload: {
      action: action.id,
      stage: stageIndex + 1,
      stageKey: stage.id,
      field,
      fieldKey: `${stage.id}.${slug(field)}`,
      value,
      provenance,
      recordedAt,
      resource: action.resource,
      account: action.account,
      region: action.region,
      environment: action.environment,
      controls: STAGE_CONTROLS[stageIndex]?.map(
        (c) => `${c.framework} ${c.ref}`,
      ),
      ...(artifactName ? { artifact: artifactName } : {}),
    },

    artifact: artifactName
      ? {
          name: artifactName,
          sha256: digest(`${seed}:artifact`),
          bytes: num(`${seed}b`, 900, 240000),
        }
      : undefined,

    controls: STAGE_CONTROLS[stageIndex] ?? [],
    exportable: true,
  };
}

/* ------------------------------------------------------------------ *
 * Export
 * ------------------------------------------------------------------ */

export type FieldExportResult =
  | { ok: true; filename: string }
  | { ok: false; error: string };

/**
 * Export one field's record.
 *
 * Same build → serialise → VERIFY → download order the events export uses: the
 * file is only written once it has been parsed back and checked, so a reader
 * never receives a partial or malformed artifact and believes it is evidence.
 */
export function exportFieldDetail(detail: FieldDetail): FieldExportResult {
  try {
    const doc = {
      schema: "cloudguard.remediation.field",
      version: 1,
      exportedAt: new Date().toISOString(),
      stage: detail.stage,
      stageLabel: detail.stageLabel,
      field: detail.field,
      derivation: Object.fromEntries(
        detail.derivation.map((d) => [d.label, d.value]),
      ),
      record: detail.payload,
      artifact: detail.artifact,
    };

    const text = JSON.stringify(doc, null, 2);

    const parsed = JSON.parse(text) as typeof doc;
    if (parsed.field !== detail.field)
      throw new Error("export does not describe the requested field");
    if (!parsed.record || typeof parsed.record !== "object")
      throw new Error("export is missing its record");

    const filename = `${detail.payload.action}-stage${detail.stage}-${slug(
      detail.field,
    )}.json`;

    const url = URL.createObjectURL(
      new Blob([text], { type: "application/json" }),
    );
    try {
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.rel = "noopener";
      a.click();
    } finally {
      URL.revokeObjectURL(url);
    }
    return { ok: true, filename };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

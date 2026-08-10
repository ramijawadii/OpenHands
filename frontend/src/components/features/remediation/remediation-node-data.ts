import {
  EPOCH,
  hash,
  num,
  pick,
  type ActionSeverity,
  type RemediationAction,
} from "./remediation-data";
import {
  buildAssets,
  buildFindings,
  digest,
  type LinkedAsset,
  type LinkedFinding,
} from "./remediation-detail-data";

/**
 * Findings, assets, and the join between them.
 *
 * A finding and an asset are DIFFERENT KINDS OF OBJECT and are modelled
 * separately:
 *
 *   finding — an observation with a lifecycle. Detector, rule, first seen,
 *             occurrences, severity. Many per asset. Closes.
 *   asset   — a thing that exists. Kind, owner, criticality, data class,
 *             exposure. One identity. Reconfigured or destroyed, never closed.
 *
 * They were previously served by one panel derived from the ACTION, so every
 * node rendered the same location block and the same summary — two different
 * assets were the same page with a different heading.
 *
 * The join is built ONCE and read from both sides, so "this finding affects 3
 * assets" and "this asset has 2 findings" cannot disagree. A join computed per
 * direction is a join that drifts.
 */

/* ------------------------------------------------------------------ *
 * The join
 * ------------------------------------------------------------------ */

export interface FindingAssetLink {
  findingId: string;
  assetId: string;
}

/**
 * Deterministic bipartite map.
 *
 * Every finding attaches to at least one asset — a finding with no asset is not
 * actionable, and would be a data error rather than an empty state. The first
 * finding always attaches to the action's primary asset, so the record's
 * headline finding and its headline resource agree.
 */
export function buildLinks(action: RemediationAction): FindingAssetLink[] {
  const findings = buildFindings(action);
  const assets = buildAssets(action);
  const links: FindingAssetLink[] = [];
  if (!assets.length) return links;

  findings.forEach((f, fi) => {
    const add = (a: LinkedAsset | undefined) => {
      if (!a) return;
      if (links.some((l) => l.findingId === f.id && l.assetId === a.id)) return;
      links.push({ findingId: f.id, assetId: a.id });
    };

    if (fi === 0) add(assets[0]);
    const count =
      1 + (hash(`${action.id}${f.id}n`) % Math.min(3, assets.length));
    for (let i = 0; i < count; i += 1)
      add(assets[(hash(`${action.id}${f.id}${i}`) + i) % assets.length]);
  });

  return links;
}

/** Assets this finding was raised against. */
export function assetsForFinding(
  action: RemediationAction,
  findingId: string,
): LinkedAsset[] {
  const ids = new Set(
    buildLinks(action)
      .filter((l) => l.findingId === findingId)
      .map((l) => l.assetId),
  );
  return buildAssets(action).filter((a) => ids.has(a.id));
}

/** Findings raised against this asset. */
export function findingsOnAsset(
  action: RemediationAction,
  assetId: string,
): LinkedFinding[] {
  const ids = new Set(
    buildLinks(action)
      .filter((l) => l.assetId === assetId)
      .map((l) => l.findingId),
  );
  return buildFindings(action).filter((f) => ids.has(f.id));
}

/** Count only — the Findings table's `Assets` column. */
export function assetCountFor(
  action: RemediationAction,
  findingId: string,
): number {
  return buildLinks(action).filter((l) => l.findingId === findingId).length;
}

/* ------------------------------------------------------------------ *
 * Shared row / section shape
 * ------------------------------------------------------------------ */

export interface NodeRow {
  label: string;
  value: string;
  /** Identifiers, ARNs, CIDRs — rendered monospace. */
  mono?: boolean;
  /** Dropped rather than rendered as "—". A placeholder is not a value. */
  absent?: boolean;
}

export interface NodeSection {
  id: string;
  label: string;
  rows: NodeRow[];
}

const s = (id: string, label: string, rows: NodeRow[]): NodeSection => ({
  id,
  label,
  rows: rows.filter((r) => !r.absent),
});

const REGION_AZ: Record<string, string> = {
  "us-east-1": "us-east-1a",
  "eu-west-1": "eu-west-1b",
  "ap-south-1": "ap-south-1a",
  "us-west-2": "us-west-2a",
};

export interface ViolatedControl {
  framework: string;
  ref: string;
  title: string;
}

/* ------------------------------------------------------------------ *
 * Finding
 * ------------------------------------------------------------------ */

export interface FindingNode {
  finding: LinkedFinding;
  /** What an operator quotes in a ticket. */
  ref: string;
  /** One line under the title: severity · detector · age. */
  summary: string;
  detection: NodeSection;
  impact: NodeSection;
  /** Controls this finding BREACHES — the justification for the action. */
  violates: ViolatedControl[];
  assets: LinkedAsset[];
  remediation: NodeSection;
  logs: string[];
}

const VIOLATIONS: ViolatedControl[] = [
  { framework: "NIST SP 800-53", ref: "SC-7", title: "Boundary Protection" },
  {
    framework: "NIST CSF",
    ref: "PR.AA",
    title: "Identity Management & Access Control",
  },
  {
    framework: "CIS AWS",
    ref: "5.2",
    title: "No security group allows ingress from 0.0.0.0/0",
  },
  {
    framework: "MITRE ATT&CK",
    ref: "T1190",
    title: "Exploit Public-Facing Application — what this weakness enables",
  },
  { framework: "PCI DSS", ref: "1.3", title: "Restrict inbound traffic" },
];

export function buildFindingNode(
  action: RemediationAction,
  finding: LinkedFinding,
): FindingNode {
  const seed = `${action.id}:f:${finding.id}`;
  const assets = assetsForFinding(action, finding.id);
  const ageDays = Math.max(
    1,
    Math.round((EPOCH - finding.firstSeen.getTime()) / 86400000),
  );

  return {
    finding,
    ref: finding.id,
    summary: `${finding.severity} · ${finding.detector} · open ${ageDays}d · ${assets.length} asset${assets.length === 1 ? "" : "s"}`,

    detection: s("detection", "Detection", [
      { label: "Detector", value: finding.detector, mono: true },
      {
        label: "Rule",
        value: `RULE-${num(`${seed}r`, 1000, 9999)}`,
        mono: true,
      },
      {
        label: "Rule version",
        value: `${1 + (hash(seed) % 4)}.${hash(`${seed}v`) % 10}`,
        mono: true,
      },
      {
        label: "First seen",
        value: finding.firstSeen.toISOString().slice(0, 10),
      },
      {
        label: "Last seen",
        value: new Date(EPOCH - num(`${seed}l`, 0, 48) * 3600000)
          .toISOString()
          .slice(0, 10),
      },
      { label: "Occurrences", value: String(num(`${seed}o`, 1, 40)) },
      {
        label: "Dedupe key",
        value: `dk_${digest(seed).slice(0, 12)}`,
        mono: true,
      },
      { label: "Asserted by", value: finding.provenance },
    ]),

    impact: s("impact", "Impact", [
      { label: "Severity", value: finding.severity },
      {
        label: "Exploitability",
        value: pick(["High", "Moderate", "Low"], `${seed}e`),
      },
      {
        label: "Exposure",
        value:
          action.environment === "prod" ? "Internet-facing" : "Internal only",
      },
      {
        label: "Data at risk",
        value: pick(["Restricted", "Confidential", "Internal"], `${seed}d`),
      },
      {
        label: "Closes with this action",
        value: finding.closes === "Full" ? "Fully" : "Partially",
      },
    ]),

    violates: VIOLATIONS.slice(0, 2 + (hash(`${seed}c`) % 3)),
    assets,

    remediation: s("remediation", "Linked remediation", [
      { label: "Action", value: action.id, mono: true },
      { label: "Status", value: action.status },
      { label: "Stage", value: `${action.stage} of 10` },
      {
        label: "Strategy",
        value: action.auto ? "IAC_PR" : "CHANGE_REQUEST",
        mono: true,
      },
      {
        label: "Rollback",
        value:
          action.environment === "prod" && !action.auto
            ? "Untested"
            : "Verified",
      },
    ]),

    logs: [
      `${finding.firstSeen.toISOString()}  ${finding.detector}  raised ${finding.id}`,
      `${new Date(EPOCH - 7200000).toISOString()}  agent    correlated to ${action.id}`,
      `${new Date(EPOCH - 3600000).toISOString()}  agent    ${assets.length} asset(s) attributed`,
      `${new Date(EPOCH - 1800000).toISOString()}  policy   gate applied: ${action.environment}`,
    ],
  };
}

/* ------------------------------------------------------------------ *
 * Asset
 * ------------------------------------------------------------------ */

export interface AssetNode {
  asset: LinkedAsset;
  /** Provider-style path — copy-paste into a console or CLI. */
  ref: string;
  summary: string;
  placement: NodeSection;
  identity: NodeSection;
  posture: NodeSection;
  findings: LinkedFinding[];
  /** Worst severity among findings on it — drives the callout. */
  worst?: ActionSeverity;
  logs: string[];
}

const SEVERITY_RANK: ActionSeverity[] = ["Critical", "High", "Medium", "Low"];

export function buildAssetNode(
  action: RemediationAction,
  asset: LinkedAsset,
): AssetNode {
  const seed = `${action.id}:a:${asset.id}`;
  const az = REGION_AZ[action.region] ?? `${action.region}a`;
  const findings = findingsOnAsset(action, asset.id);
  const worst = SEVERITY_RANK.find((r) =>
    findings.some((f) => f.severity === r),
  );

  const path =
    action.provider === "AWS"
      ? `arn:aws:${action.region}:${action.account}:${asset.name}`
      : `/${action.provider.toLowerCase()}/${action.account}/${action.region}/${asset.name}`;

  return {
    asset,
    ref: path,
    summary: `${asset.kind} · ${findings.length} finding${findings.length === 1 ? "" : "s"} · ${asset.criticality}`,

    placement: s("placement", "Cloud & location", [
      { label: "Cloud", value: action.provider },
      { label: "Account / Subscription", value: action.account, mono: true },
      { label: "Region / AZ", value: `${action.region} / ${az}`, mono: true },
      {
        label: "VPC / Subnet",
        value: `${action.environment}-vpc / ${action.environment}-private-${az}`,
        mono: true,
      },
      { label: "Environment", value: action.environment },
    ]),

    identity: s("identity", "Identity & access", [
      { label: "Owner", value: action.owner },
      { label: "Team", value: action.team },
      { label: "Attached roles", value: String(num(`${seed}r`, 1, 6)) },
      {
        label: "Public access",
        value: asset.exposure === "Internet-facing" ? "Allowed" : "Blocked",
      },
      {
        label: "Last access",
        value: new Date(EPOCH - num(`${seed}la`, 1, 200) * 3600000)
          .toISOString()
          .slice(0, 10),
      },
    ]),

    posture: s("posture", "Posture", [
      { label: "Criticality", value: asset.criticality },
      { label: "Data classification", value: asset.dataClass },
      { label: "Exposure", value: asset.exposure },
      {
        label: "Encryption at rest",
        value: hash(`${seed}enc`) % 3 ? "Enabled" : "Disabled",
      },
      {
        label: "Logging",
        value: hash(`${seed}log`) % 4 ? "Enabled" : "Disabled",
      },
      {
        label: "Last scanned",
        value: new Date(EPOCH - num(`${seed}s`, 1, 48) * 3600000)
          .toISOString()
          .slice(0, 16)
          .replace("T", " "),
      },
    ]),

    findings,
    worst,

    logs: [
      `${new Date(EPOCH - 86400000).toISOString()}  scanner  ${asset.name} inventoried`,
      `${new Date(EPOCH - 43200000).toISOString()}  scanner  ${findings.length} finding(s) attributed`,
      `${new Date(EPOCH - 3600000).toISOString()}  agent    included in ${action.id} scope`,
    ],
  };
}

/** Stable node id, so a graph selection and a table row agree. */
export function nodeId(action: RemediationAction, name: string): string {
  return `nd_${digest(`${action.id}:${name}`).slice(0, 10)}`;
}

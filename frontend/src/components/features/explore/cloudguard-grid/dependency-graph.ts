import type { EventRow } from "./event-data";

/**
 * The topology behind the Dependency Graph canvas.
 *
 * Built for triage, not for infrastructure exploration: every node carries the
 * things that decide whether it is worth opening — health, risk, how many
 * alerts and findings sit on it, who owns it, and when it last changed. A
 * dependency graph that only shows names makes an analyst open each node to
 * find out which one matters, which is the opposite of triage.
 *
 * Derived deterministically from the event, so the same incident renders the
 * same topology every time. No discovery service yet; this is the shape one
 * would fill.
 */

export type NodeKind =
  | "VM"
  | "Container"
  | "Storage"
  | "Database"
  | "Function"
  | "LoadBalancer"
  | "Identity"
  | "Network"
  | "KeyVault"
  | "Service";

export type Health = "Healthy" | "Warning" | "Critical" | "Unknown";

export type Direction = "upstream" | "downstream" | "self";

export type EdgeKind = "depends" | "network" | "identity" | "replication";

export interface GraphNode {
  id: string;
  name: string;
  kind: NodeKind;
  direction: Direction;
  /** Hops from the affected resource; 0 is the resource itself. */
  depth: number;
  health: Health;
  risk: number;
  alerts: number;
  findings: number;
  incidents: number;
  owner: string;
  env: string;
  cloud: string;
  region: string;
  dependencies: number;
  dependents: number;
  lastChangeMinutes: number;
  lastDeployMinutes: number;
  recentChanges: number;
  relatedFindings: string[];
  summary: string;
  /** True for the one node the reconstruction blames. */
  rootCause: boolean;
}

export interface GraphEdge {
  source: string;
  target: string;
  kind: EdgeKind;
}

export interface Topology {
  nodes: GraphNode[];
  edges: GraphEdge[];
  rootId: string;
  rootCauseId: string | null;
  blastRadius: number;
  dependencyCount: number;
  generatedAt: Date;
}

/** Upstream shapes differ by what the affected resource actually sits on. */
const UPSTREAM_BY_SERVICE: Record<string, [string, NodeKind, EdgeKind][]> = {
  Compute: [
    ["vpc", "Network", "network"],
    ["subnet", "Network", "network"],
    ["instance-profile", "Identity", "identity"],
    ["ami", "Storage", "depends"],
  ],
  Storage: [
    ["kms-key", "KeyVault", "identity"],
    ["bucket-policy", "Identity", "identity"],
    ["vpc-endpoint", "Network", "network"],
    ["replication-rule", "Storage", "replication"],
  ],
  Database: [
    ["subnet-group", "Network", "network"],
    ["kms-key", "KeyVault", "identity"],
    ["parameter-group", "Service", "depends"],
    ["secret", "KeyVault", "identity"],
  ],
  Serverless: [
    ["execution-role", "Identity", "identity"],
    ["layer", "Storage", "depends"],
    ["vpc-config", "Network", "network"],
    ["env-secret", "KeyVault", "identity"],
  ],
  Networking: [
    ["target-group", "Service", "depends"],
    ["listener", "Network", "network"],
    ["certificate", "KeyVault", "identity"],
    ["waf-acl", "Network", "network"],
  ],
};

const DOWNSTREAM_BY_SERVICE: Record<string, [string, NodeKind, EdgeKind][]> = {
  Compute: [
    ["app-service", "Service", "depends"],
    ["worker", "Container", "depends"],
    ["cron", "Function", "depends"],
  ],
  Storage: [
    ["etl-job", "Function", "depends"],
    ["analytics-view", "Database", "depends"],
    ["cdn-origin", "Service", "network"],
    ["backup-set", "Storage", "replication"],
  ],
  Database: [
    ["api-service", "Service", "depends"],
    ["read-replica", "Database", "replication"],
    ["report-job", "Function", "depends"],
  ],
  Serverless: [
    ["api-route", "Service", "network"],
    ["queue-consumer", "Container", "depends"],
    ["scheduled-task", "Function", "depends"],
  ],
  Networking: [
    ["upstream-app", "Service", "depends"],
    ["canary", "Container", "depends"],
    ["blue-target", "Service", "depends"],
    ["green-target", "Service", "depends"],
  ],
};

const KIND_BY_SERVICE: Record<string, NodeKind> = {
  Compute: "VM",
  Storage: "Storage",
  Database: "Database",
  Serverless: "Function",
  Networking: "LoadBalancer",
};

const OWNERS = ["platform", "payments", "data-eng", "identity", "edge"];

const SUMMARY_BY_HEALTH: Record<Health, string> = {
  Healthy: "Serving normally; no open signals.",
  Warning: "Degraded — elevated error rate against its dependents.",
  Critical: "Unavailable or failing its health check.",
  Unknown: "No telemetry received; treat its state as unproven.",
};

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

function healthFrom(risk: number, alerts: number): Health {
  if (risk >= 80 || alerts >= 3) return "Critical";
  if (risk >= 55 || alerts >= 1) return "Warning";
  if (risk < 12) return "Unknown";
  return "Healthy";
}

/** Suggested next steps, keyed by what is actually wrong with the node. */
export function nextSteps(n: GraphNode): string[] {
  if (n.health === "Critical") {
    return [
      "Check the most recent deployment to this resource.",
      "Review dependent services for cascading failure.",
      "Verify authentication and network reachability.",
      "Inspect configuration changes in the last hour.",
      "Open the related findings below.",
    ];
  }
  if (n.health === "Warning") {
    return [
      "Compare error rate against the last known-good window.",
      "Check whether a dependency degraded first.",
      "Review recent configuration changes.",
      "Confirm capacity headroom.",
    ];
  }
  if (n.health === "Unknown") {
    return [
      "Confirm the telemetry agent is reporting.",
      "Check whether the resource still exists.",
      "Verify the collector's permissions on this account.",
    ];
  }
  return [
    "No action — retained as context for the affected resource.",
    "Re-check if the incident widens.",
  ];
}

export function buildTopology(e: EventRow): Topology {
  const rand = seeded(`${e.id}:topology`);
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  const rootId = e.resource;
  const upSpec =
    UPSTREAM_BY_SERVICE[e.serviceType] ?? UPSTREAM_BY_SERVICE.Compute;
  const downSpec =
    DOWNSTREAM_BY_SERVICE[e.serviceType] ?? DOWNSTREAM_BY_SERVICE.Compute;

  const make = (
    name: string,
    kind: NodeKind,
    direction: Direction,
    depth: number,
    riskFloor: number,
  ): GraphNode => {
    const risk = Math.min(
      99,
      Math.round(riskFloor + rand() * (95 - riskFloor)),
    );
    const alerts =
      risk > 70 ? 1 + Math.floor(rand() * 4) : Math.floor(rand() * 2);
    const health = healthFrom(risk, alerts);
    return {
      id: name,
      name,
      kind,
      direction,
      depth,
      health,
      risk,
      alerts,
      findings: Math.floor(rand() * 7),
      incidents: risk > 78 ? 1 + Math.floor(rand() * 2) : 0,
      owner: OWNERS[Math.floor(rand() * OWNERS.length)],
      env: e.env,
      cloud: e.provider,
      region: e.region,
      dependencies: 1 + Math.floor(rand() * 14),
      dependents: Math.floor(rand() * 30),
      lastChangeMinutes: 5 + Math.floor(rand() * 900),
      lastDeployMinutes: 30 + Math.floor(rand() * 2400),
      recentChanges: Math.floor(rand() * 8),
      relatedFindings: e.relatedFindings.slice(0, 1 + Math.floor(rand() * 2)),
      summary: SUMMARY_BY_HEALTH[health],
      rootCause: false,
    };
  };

  // The affected resource is always the centre and always critical: it is the
  // reason the graph is open.
  const root = make(
    rootId,
    KIND_BY_SERVICE[e.serviceType] ?? "Service",
    "self",
    0,
    88,
  );
  root.health = "Critical";
  root.risk = Math.max(root.risk, 85);
  root.dependents = e.blastRadius;
  root.summary = e.message;
  nodes.push(root);

  upSpec.forEach(([stem, kind, edgeKind], i) => {
    const n = make(`${stem}-${100 + i}`, kind, "upstream", 1, 20);
    nodes.push(n);
    edges.push({ source: n.id, target: rootId, kind: edgeKind });

    // A second upstream hop only where it says something: identity and network
    // chains are where root causes actually hide.
    if (kind === "Identity" || kind === "Network") {
      const deeper = make(`${stem}-parent-${200 + i}`, kind, "upstream", 2, 15);
      nodes.push(deeper);
      edges.push({ source: deeper.id, target: n.id, kind: edgeKind });
    }
  });

  downSpec.forEach(([stem, kind, edgeKind], i) => {
    const n = make(`${stem}-${300 + i}`, kind, "downstream", 1, 30);
    nodes.push(n);
    edges.push({ source: rootId, target: n.id, kind: edgeKind });

    if (rand() > 0.45) {
      const deeper = make(
        `${stem}-consumer-${400 + i}`,
        kind,
        "downstream",
        2,
        25,
      );
      nodes.push(deeper);
      edges.push({ source: n.id, target: deeper.id, kind: "depends" });
    }
  });

  // Exactly one root cause: the worst upstream node the failure could have come
  // through. Blaming several would be the same as blaming none.
  const candidate = nodes
    .filter((n) => n.direction === "upstream")
    .sort((a, b) => b.risk - a.risk)[0];
  if (candidate) candidate.rootCause = true;

  return {
    nodes,
    edges,
    rootId,
    rootCauseId: candidate?.id ?? null,
    blastRadius: e.blastRadius,
    dependencyCount: edges.length,
    generatedAt: new Date(),
  };
}

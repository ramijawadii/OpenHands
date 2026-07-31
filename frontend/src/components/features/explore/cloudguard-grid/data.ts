export interface ResourceRow {
  id: string;
  /** 0 = account, 1 = cluster, 2 = resource. */
  level: number;
  parentId: string | null;
  hasChildren: boolean;
  resource: string;
  kind: string;
  serviceType: string;
  provider: string;
  region: string;
  country: string;
  account: string;
  environment: string;
  owner: string;
  severity: string;
  riskScore: number;
  findings: number;
  exposure: string;
  monthlyCost: number;
  compliant: boolean;
  lastSeen: Date;
  /** 12-point trend used by the sparkline renderer. */
  trend: number[];
}

export const PROVIDERS = ["AWS", "Azure", "GCP", "OCI", "Alibaba"];
export const REGIONS = [
  "eu-west-1",
  "us-east-1",
  "ap-south-1",
  "westeurope",
  "europe-west4",
];
export const KINDS = [
  "Instance",
  "Bucket",
  "Function",
  "Database",
  "LoadBalancer",
];
export const SEVERITIES = ["Critical", "High", "Medium", "Low"];
export const ENVIRONMENTS = ["prod", "staging", "dev"];
export const OWNERS = ["platform", "data", "finance", "security", "web"];
export const EXPOSURES = ["Public", "Internal", "Private"];

/**
 * Cloud region → the country that region physically sits in. Data residency
 * is a compliance question, so the country is worth showing directly rather
 * than making people decode region codes.
 */
export const REGION_COUNTRY: Record<string, string> = {
  "eu-west-1": "IE",
  "us-east-1": "US",
  "ap-south-1": "IN",
  westeurope: "NL",
  "europe-west4": "NL",
};

/** Service class each resource kind belongs to. */
export const SERVICE_TYPE: Record<string, string> = {
  Account: "Organisation",
  Cluster: "Compute",
  Instance: "Compute",
  Bucket: "Storage",
  Database: "Database",
  Function: "Serverless",
  LoadBalancer: "Networking",
};

/** Ordered worst-first, so `Math.min` of the indices is the worst severity. */
const SEVERITY_RANK = ["Critical", "High", "Medium", "Low"];

/**
 * Deterministic pseudo-random so a given index always yields the same row.
 * Keeps the tree stable across re-renders and row-count changes.
 */
function rand(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function pick<T>(arr: T[], seed: number): T {
  return arr[Math.floor(rand(seed) * arr.length) % arr.length];
}

function trendFor(seed: number): number[] {
  const t: number[] = [];
  for (let i = 0; i < 12; i += 1) t.push(Math.round(rand(seed * 13 + i) * 100));
  return t;
}

/**
 * Computes the roll-up of child metrics for a parent row.
 *
 * Returns the aggregate rather than mutating the parent, so callers stay in
 * control of assignment and the parent object is never reassigned in place by
 * a helper.
 */
function rollUp(children: ResourceRow[]): Partial<ResourceRow> {
  if (children.length === 0) return {};
  return {
    findings: children.reduce((a, c) => a + c.findings, 0),
    monthlyCost:
      Math.round(children.reduce((a, c) => a + c.monthlyCost, 0) * 100) / 100,
    riskScore: Math.round(
      children.reduce((a, c) => a + c.riskScore, 0) / children.length,
    ),
    severity:
      SEVERITY_RANK[
        Math.min(...children.map((c) => SEVERITY_RANK.indexOf(c.severity)))
      ],
    compliant: children.every((c) => c.compliant),
    trend: children[0].trend,
  };
}

/**
 * Builds an Account › Cluster › Resource tree, flattened into parent/child
 * rows in depth-first order.
 *
 * Flat-with-`parentId` rather than nested children because AG Grid Community
 * has no tree row model — `TreeDataModule` and `RowGroupingModule` are both
 * Enterprise. Depth-first order means the flat array is already the correct
 * display order, so expanding a node is purely a visibility question, handled
 * by an external filter in the grid.
 *
 * @param leafCount approximate number of leaf (resource) rows to generate.
 */
export function buildRows(leafCount: number): ResourceRow[] {
  const rows: ResourceRow[] = [];
  const perCluster = 8;
  const clustersPerAccount = 5;
  const clusterCount = Math.max(1, Math.ceil(leafCount / perCluster));
  const accountCount = Math.max(
    1,
    Math.ceil(clusterCount / clustersPerAccount),
  );
  const now = Date.now();
  let leaves = 0;

  for (let a = 0; a < accountCount && leaves < leafCount; a += 1) {
    const accountId = `acct-${1000 + a}`;
    const accountRow: ResourceRow = {
      id: accountId,
      level: 0,
      parentId: null,
      hasChildren: true,
      resource: accountId,
      kind: "Account",
      serviceType: SERVICE_TYPE.Account,
      provider: pick(PROVIDERS, a + 1),
      region: "—",
      country: "—",
      account: accountId,
      environment: pick(ENVIRONMENTS, a + 2),
      owner: pick(OWNERS, a + 3),
      severity: "Low",
      riskScore: 0,
      findings: 0,
      exposure: "—",
      monthlyCost: 0,
      compliant: true,
      lastSeen: new Date(now),
      trend: trendFor(a + 1),
    };
    rows.push(accountRow);
    const accountChildren: ResourceRow[] = [];

    for (let c = 0; c < clustersPerAccount && leaves < leafCount; c += 1) {
      const clusterSeed = a * 100 + c;
      const clusterId = `${accountId}/cluster-${c + 1}`;
      const clusterRow: ResourceRow = {
        id: clusterId,
        level: 1,
        parentId: accountId,
        hasChildren: true,
        resource: `cluster-${c + 1}`,
        kind: "Cluster",
        serviceType: SERVICE_TYPE.Cluster,
        provider: accountRow.provider,
        region: pick(REGIONS, clusterSeed + 4),
        country: "",
        account: accountId,
        environment: pick(ENVIRONMENTS, clusterSeed + 5),
        owner: pick(OWNERS, clusterSeed + 6),
        severity: "Low",
        riskScore: 0,
        findings: 0,
        exposure: "—",
        monthlyCost: 0,
        compliant: true,
        lastSeen: new Date(now),
        trend: trendFor(clusterSeed + 2),
      };
      clusterRow.country = REGION_COUNTRY[clusterRow.region] ?? "—";
      rows.push(clusterRow);
      const clusterChildren: ResourceRow[] = [];

      for (let r = 0; r < perCluster && leaves < leafCount; r += 1) {
        const s = clusterSeed * 10 + r;
        const kind = pick(KINDS, s + 1);
        const leaf: ResourceRow = {
          id: `${clusterId}/${kind.toLowerCase()}-${r + 1}`,
          level: 2,
          parentId: clusterId,
          hasChildren: false,
          resource: `${kind.toLowerCase()}-${(leaves + 1).toString().padStart(5, "0")}`,
          kind,
          serviceType: SERVICE_TYPE[kind] ?? "Other",
          provider: clusterRow.provider,
          region: clusterRow.region,
          country: REGION_COUNTRY[clusterRow.region] ?? "—",
          account: accountId,
          environment: clusterRow.environment,
          owner: pick(OWNERS, s + 7),
          severity: pick(SEVERITIES, s + 2),
          riskScore: Math.round(rand(s + 8) * 100),
          findings: Math.floor(rand(s + 9) * 40),
          exposure: pick(EXPOSURES, s + 10),
          monthlyCost: Math.round(rand(s + 11) * 900000) / 100,
          compliant: rand(s + 12) > 0.35,
          lastSeen: new Date(now - Math.floor(rand(s + 13) * 90) * 86400000),
          trend: trendFor(s + 3),
        };
        rows.push(leaf);
        clusterChildren.push(leaf);
        leaves += 1;
      }

      Object.assign(clusterRow, rollUp(clusterChildren));
      accountChildren.push(clusterRow);
    }

    Object.assign(accountRow, rollUp(accountChildren));
  }

  return rows;
}

/** Ids of every row that has children — used for expand-all. */
export function branchIds(rows: ResourceRow[]): string[] {
  return rows.filter((r) => r.hasChildren).map((r) => r.id);
}

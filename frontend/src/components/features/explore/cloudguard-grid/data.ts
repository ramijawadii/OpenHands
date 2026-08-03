/**
 * Resource record — mirrors the field tree in
 * `docs/architecture/cmdb-plan/10-field-tree.md`.
 *
 * 8 groups → 24 sub-groups. Field order below follows the tree exactly, so the
 * document and the type stay comparable at a glance.
 *
 * **Generated data, no backend.** Values are deterministic (seeded from the row
 * index) so a given row always looks the same across reloads — which matters
 * when comparing filter results between runs.
 */
export interface ResourceRow {
  /* ── Resource · Identity ─────────────────────────────────────────── */
  /** Display/tree key. NOT a join key — see the CMDB plan. */
  id: string;
  urn: string;
  nativeId: string;
  providerAccountId: string;
  resource: string;

  /* ── Resource · Classification ───────────────────────────────────── */
  kind: string;
  serviceType: string;
  providerService: string;

  /* ── Resource · Lifecycle ────────────────────────────────────────── */
  state: string;
  createdAt: Date;
  ageDays: number;
  deletionProtection: boolean;

  /* ── Resource · Provenance ───────────────────────────────────────── */
  managedBy: string;
  driftState: string;
  iacRepo: string;

  /* ── Placement · Cloud / Geography / Network ─────────────────────── */
  provider: string;
  account: string;
  environment: string;
  region: string;
  country: string;
  availabilityZone: string;
  vpcId: string;
  subnetId: string;
  publicIp: string;
  dnsName: string;

  /* ── Ownership · Business / People / Classification ──────────────── */
  application: string;
  businessUnit: string;
  costCenter: string;
  owner: string;
  businessOwner: string;
  onCall: string;
  criticalityTier: string;
  dataClassification: string;
  tags: string[];

  /* ── Risk · Summary / Vulnerabilities / Exposure / Graph ─────────── */
  severity: string;
  riskScore: number;
  trend: number[];
  cveCritical: number;
  cveHigh: number;
  cveMedium: number;
  cveLow: number;
  kev: number;
  exploitAvailable: boolean;
  secretsExposed: number;
  internetReachable: boolean;
  exposure: string;
  iamPrincipals: number;
  blastRadius: number;
  attackPaths: number;

  /* ── Compliance · Status / Exceptions / Evidence ─────────────────── */
  compliance: string;
  controlsPassed: number;
  controlsFailed: number;
  waiverExpiry: Date | null;
  auditScope: string;
  lastScan: Date;

  /* ── Resilience · Encryption / Backup / Availability ─────────────── */
  encryptionAtRest: string;
  encryptionInTransit: boolean;
  backupEnabled: boolean;
  lastBackup: Date | null;
  restoreTested: Date | null;
  multiAz: boolean;

  /* ── Operations · Health / Coverage ──────────────────────────────── */
  health: string;
  uptime30d: number;
  incidents30d: number;
  mttrMinutes: number;
  monitoring: boolean;
  logForwarding: boolean;
  agentInstalled: boolean;

  /* ── Discovery · Freshness / Anomalies ───────────────────────────── */
  staleness: string;
  lastVerified: Date;
  confidence: number;
  discoverySource: string;
  isShadow: boolean;
  isOrphaned: boolean;
  firstSeen: Date;

  /* ── Tree plumbing — never a join key, never a column ─────────────── */
  level: number;
  parentId: string | null;
  hasChildren: boolean;
}

/* ─────────────────────────── enums ─────────────────────────── */

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
export const ENVIRONMENTS = ["prod", "staging", "dev", "sandbox"];
export const OWNERS = ["platform", "data", "finance", "security", "web"];
export const EXPOSURES = ["Public", "Internal", "Private"];
export const HEALTH = ["Healthy", "Degraded", "Outage"];
export const COMPLIANCE = ["Compliant", "Drift", "Untagged", "Non-compliant"];
export const STATES = ["running", "stopped", "terminated", "error"];
export const MANAGED_BY = ["terraform", "cloudformation", "pulumi", "manual"];
export const DRIFT_STATES = ["in-sync", "drifted", "unmanaged"];
export const TIERS = ["Tier 0", "Tier 1", "Tier 2", "Tier 3"];
export const DATA_CLASSES = [
  "Public",
  "Internal",
  "Confidential",
  "PII",
  "PCI",
  "PHI",
];
export const ENCRYPTION = ["none", "provider-managed", "CMEK", "HYOK"];
export const DISCOVERY_SOURCES = [
  "api-scan",
  "agent",
  "iac",
  "manual",
  "inferred",
];
export const AUDIT_SCOPES = ["PCI", "SOX", "HIPAA", "None"];
export const APPLICATIONS = [
  "checkout",
  "ledger",
  "identity-svc",
  "reporting",
  "ingest",
  "notifications",
];
export const BUSINESS_UNITS = ["Retail", "Payments", "Platform", "Corporate"];

/** Service class per resource kind. */
export const SERVICE_TYPE: Record<string, string> = {
  Account: "Organisation",
  Cluster: "Compute",
  Instance: "Compute",
  Bucket: "Storage",
  Database: "Database",
  Function: "Serverless",
  LoadBalancer: "Networking",
};

/** Provider-native service name per kind. */
const PROVIDER_SERVICE: Record<string, Record<string, string>> = {
  AWS: {
    Instance: "ec2",
    Bucket: "s3",
    Database: "rds",
    Function: "lambda",
    LoadBalancer: "elb",
    Cluster: "eks",
    Account: "organizations",
  },
  Azure: {
    Instance: "vm",
    Bucket: "blob",
    Database: "sql",
    Function: "functions",
    LoadBalancer: "lb",
    Cluster: "aks",
    Account: "subscription",
  },
  GCP: {
    Instance: "compute",
    Bucket: "gcs",
    Database: "cloudsql",
    Function: "cloudfunctions",
    LoadBalancer: "lb",
    Cluster: "gke",
    Account: "project",
  },
  OCI: {
    Instance: "compute",
    Bucket: "objectstorage",
    Database: "autonomousdb",
    Function: "functions",
    LoadBalancer: "lb",
    Cluster: "oke",
    Account: "tenancy",
  },
  Alibaba: {
    Instance: "ecs",
    Bucket: "oss",
    Database: "rds",
    Function: "fc",
    LoadBalancer: "slb",
    Cluster: "ack",
    Account: "account",
  },
};

export const REGION_COUNTRY: Record<string, string> = {
  "eu-west-1": "IE",
  "us-east-1": "US",
  "ap-south-1": "IN",
  westeurope: "NL",
  "europe-west4": "NL",
};

/** Ranked worst-first, so `Math.min` of indices gives the worst case. */
const SEVERITY_RANK = ["Critical", "High", "Medium", "Low"];
const HEALTH_RANK = ["Outage", "Degraded", "Healthy"];
const COMPLIANCE_RANK = ["Non-compliant", "Untagged", "Drift", "Compliant"];
const TIER_RANK = ["Tier 0", "Tier 1", "Tier 2", "Tier 3"];
const STALENESS_RANK = ["Untrusted", "Stale", "Ageing", "Fresh"];

/* ─────────────────────────── generation ─────────────────────────── */

/** Deterministic pseudo-random: a given seed always yields the same value. */
function rand(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function pick<T>(arr: T[], seed: number): T {
  return arr[Math.floor(rand(seed) * arr.length) % arr.length];
}

function chance(seed: number, p: number): boolean {
  return rand(seed) < p;
}

function trendFor(seed: number): number[] {
  const t: number[] = [];
  for (let i = 0; i < 12; i += 1) t.push(Math.round(rand(seed * 13 + i) * 100));
  return t;
}

function stalenessFor(hours: number): string {
  if (hours <= 6) return "Fresh";
  if (hours <= 24) return "Ageing";
  if (hours <= 72) return "Stale";
  return "Untrusted";
}

const DAY = 86400000;

/** Fields a container row inherits from its worst child. */
function rollUp(children: ResourceRow[]): Partial<ResourceRow> {
  if (children.length === 0) return {};
  const worst = (rank: string[], get: (c: ResourceRow) => string) =>
    rank[Math.min(...children.map((c) => rank.indexOf(get(c))))];
  const sum = (get: (c: ResourceRow) => number) =>
    children.reduce((a, c) => a + get(c), 0);

  return {
    severity: worst(SEVERITY_RANK, (c) => c.severity),
    health: worst(HEALTH_RANK, (c) => c.health),
    compliance: worst(COMPLIANCE_RANK, (c) => c.compliance),
    criticalityTier: worst(TIER_RANK, (c) => c.criticalityTier),
    staleness: worst(STALENESS_RANK, (c) => c.staleness),
    riskScore: Math.round(sum((c) => c.riskScore) / children.length),
    cveCritical: sum((c) => c.cveCritical),
    cveHigh: sum((c) => c.cveHigh),
    cveMedium: sum((c) => c.cveMedium),
    cveLow: sum((c) => c.cveLow),
    kev: sum((c) => c.kev),
    secretsExposed: sum((c) => c.secretsExposed),
    controlsFailed: sum((c) => c.controlsFailed),
    controlsPassed: sum((c) => c.controlsPassed),
    incidents30d: sum((c) => c.incidents30d),
    attackPaths: sum((c) => c.attackPaths),
    blastRadius: children.length,
    internetReachable: children.some((c) => c.internetReachable),
    isShadow: children.some((c) => c.isShadow),
    trend: children[0].trend,
  };
}

interface Ctx {
  seed: number;
  provider: string;
  region: string;
  environment: string;
  now: number;
}

/** Everything generated identically at every level of the tree. */
function common(kind: string, ctx: Ctx): Partial<ResourceRow> {
  const { seed: s, provider, region, now } = ctx;
  const createdDays = Math.floor(rand(s + 21) * 900) + 5;
  const staleHours = Math.floor(rand(s + 22) * 96);
  const cveCritical = Math.floor(rand(s + 30) * 4);
  const managedBy = pick(MANAGED_BY, s + 40);
  const hasBackup = chance(s + 56, 0.7);

  return {
    providerService: PROVIDER_SERVICE[provider]?.[kind] ?? "unknown",
    state: pick(STATES, s + 23),
    createdAt: new Date(now - createdDays * DAY),
    ageDays: createdDays,
    deletionProtection: chance(s + 24, 0.4),
    managedBy,
    driftState:
      managedBy === "manual" ? "unmanaged" : pick(DRIFT_STATES, s + 41),
    iacRepo:
      managedBy === "manual"
        ? "—"
        : `infra/${pick(["core", "apps", "data"], s + 42)}`,
    country: REGION_COUNTRY[region] ?? "—",
    availabilityZone: `${region}${pick(["a", "b", "c"], s + 25)}`,
    application: pick(APPLICATIONS, s + 26),
    businessUnit: pick(BUSINESS_UNITS, s + 27),
    costCenter: `CC-${1000 + Math.floor(rand(s + 28) * 40)}`,
    businessOwner: `${pick(["a.khan", "j.silva", "m.dubois", "r.hassan"], s + 29)}@corp`,
    onCall: pick(["sre-primary", "sre-secondary", "app-oncall"], s + 32),
    criticalityTier: pick(TIERS, s + 33),
    dataClassification: pick(DATA_CLASSES, s + 34),
    tags: [`env:${ctx.environment}`, `app:${pick(APPLICATIONS, s + 26)}`],
    riskScore: Math.round(rand(s + 35) * 100),
    trend: trendFor(s + 3),
    cveCritical,
    cveHigh: Math.floor(rand(s + 31) * 9),
    cveMedium: Math.floor(rand(s + 36) * 20),
    cveLow: Math.floor(rand(s + 37) * 40),
    kev: cveCritical > 0 && chance(s + 38, 0.3) ? 1 : 0,
    exploitAvailable: chance(s + 39, 0.2),
    secretsExposed: chance(s + 43, 0.12) ? Math.ceil(rand(s + 44) * 3) : 0,
    iamPrincipals: Math.floor(rand(s + 45) * 25),
    attackPaths: chance(s + 46, 0.25) ? Math.ceil(rand(s + 47) * 4) : 0,
    controlsPassed: 20 + Math.floor(rand(s + 48) * 60),
    controlsFailed: Math.floor(rand(s + 49) * 8),
    waiverExpiry: chance(s + 50, 0.12)
      ? new Date(now + Math.floor(rand(s + 51) * 90) * DAY)
      : null,
    auditScope: pick(AUDIT_SCOPES, s + 52),
    lastScan: new Date(now - Math.floor(rand(s + 53) * 5) * DAY),
    encryptionAtRest: pick(ENCRYPTION, s + 54),
    encryptionInTransit: chance(s + 55, 0.85),
    backupEnabled: hasBackup,
    lastBackup: hasBackup
      ? new Date(now - Math.floor(rand(s + 57) * 3) * DAY)
      : null,
    restoreTested: chance(s + 58, 0.35)
      ? new Date(now - Math.floor(rand(s + 59) * 200) * DAY)
      : null,
    multiAz: chance(s + 60, 0.5),
    uptime30d: Math.round((99 + rand(s + 61)) * 100) / 100,
    incidents30d: Math.floor(rand(s + 62) * 5),
    mttrMinutes: Math.floor(rand(s + 63) * 240),
    monitoring: chance(s + 64, 0.8),
    logForwarding: chance(s + 65, 0.75),
    agentInstalled: chance(s + 66, 0.65),
    staleness: stalenessFor(staleHours),
    lastVerified: new Date(now - staleHours * 3600000),
    confidence: Math.round((0.6 + rand(s + 67) * 0.4) * 100) / 100,
    discoverySource: pick(DISCOVERY_SOURCES, s + 68),
    isShadow: managedBy === "manual" && chance(s + 69, 0.4),
    isOrphaned: chance(s + 70, 0.08),
    firstSeen: new Date(now - createdDays * DAY + 3600000),
  };
}

/**
 * Builds an Account › Cluster › Resource tree, flattened depth-first so the
 * array is already display order. Community AG Grid has no tree row model —
 * hierarchy is carried by `parentId` and resolved by an external filter.
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
    const provider = pick(PROVIDERS, a + 1);
    const p = provider.toLowerCase();
    const accEnv = pick(ENVIRONMENTS, a + 2);
    const accountRow: ResourceRow = {
      ...(common("Account", {
        seed: a + 1,
        provider,
        region: "—",
        environment: accEnv,
        now,
      }) as ResourceRow),
      id: accountId,
      urn: `cg:${p}:${accountId}:global:organizations:account/${accountId}`,
      nativeId: `arn:${p}:organizations::${accountId}:account`,
      providerAccountId: accountId,
      resource: accountId,
      kind: "Account",
      serviceType: SERVICE_TYPE.Account,
      provider,
      account: accountId,
      environment: accEnv,
      region: "—",
      country: "—",
      availabilityZone: "—",
      vpcId: "—",
      subnetId: "—",
      publicIp: "—",
      dnsName: "—",
      owner: pick(OWNERS, a + 3),
      severity: "Low",
      exposure: "—",
      internetReachable: false,
      blastRadius: 0,
      health: "Healthy",
      compliance: "Compliant",
      level: 0,
      parentId: null,
      hasChildren: true,
    };
    rows.push(accountRow);
    const accountChildren: ResourceRow[] = [];

    for (let c = 0; c < clustersPerAccount && leaves < leafCount; c += 1) {
      const cs = a * 100 + c;
      const clusterId = `${accountId}/cluster-${c + 1}`;
      const region = pick(REGIONS, cs + 4);
      const env = pick(ENVIRONMENTS, cs + 5);
      const vpcId = `vpc-${(1000 + cs).toString(16)}`;
      const clusterRow: ResourceRow = {
        ...(common("Cluster", {
          seed: cs,
          provider,
          region,
          environment: env,
          now,
        }) as ResourceRow),
        id: clusterId,
        urn: `cg:${p}:${accountId}:${region}:container:cluster/cluster-${c + 1}`,
        nativeId: `arn:${p}:container:${region}:${accountId}:cluster/cluster-${c + 1}`,
        providerAccountId: accountId,
        resource: `cluster-${c + 1}`,
        kind: "Cluster",
        serviceType: SERVICE_TYPE.Cluster,
        provider,
        account: accountId,
        environment: env,
        region,
        vpcId,
        subnetId: "—",
        publicIp: "—",
        dnsName: "—",
        owner: pick(OWNERS, cs + 6),
        severity: "Low",
        exposure: "—",
        internetReachable: false,
        blastRadius: 0,
        health: "Healthy",
        compliance: "Compliant",
        level: 1,
        parentId: accountId,
        hasChildren: true,
      };
      rows.push(clusterRow);
      const clusterChildren: ResourceRow[] = [];

      for (let r = 0; r < perCluster && leaves < leafCount; r += 1) {
        const s = cs * 10 + r;
        const kind = pick(KINDS, s + 1);
        const exposure = pick(EXPOSURES, s + 10);
        const name = `${kind.toLowerCase()}-${(leaves + 1).toString().padStart(5, "0")}`;
        const svc = PROVIDER_SERVICE[provider]?.[kind] ?? "svc";
        const leaf: ResourceRow = {
          ...(common(kind, {
            seed: s,
            provider,
            region,
            environment: env,
            now,
          }) as ResourceRow),
          id: `${clusterId}/${kind.toLowerCase()}-${r + 1}`,
          urn: `cg:${p}:${accountId}:${region}:${svc}:${kind.toLowerCase()}/${name}`,
          nativeId: `arn:${p}:${svc}:${region}:${accountId}:${kind.toLowerCase()}/${name}`,
          providerAccountId: accountId,
          resource: name,
          kind,
          serviceType: SERVICE_TYPE[kind] ?? "Other",
          provider,
          account: accountId,
          environment: env,
          region,
          vpcId,
          subnetId: `subnet-${(2000 + s).toString(16)}`,
          publicIp:
            exposure === "Public"
              ? `52.${Math.floor(rand(s + 71) * 255)}.${Math.floor(rand(s + 72) * 255)}.${Math.floor(rand(s + 73) * 255)}`
              : "—",
          dnsName: exposure === "Public" ? `${name}.example.net` : "—",
          owner: pick(OWNERS, s + 7),
          severity: pick(SEVERITIES, s + 2),
          exposure,
          // Configured public is necessary but not sufficient — a resource can
          // be public yet unreachable behind a deny rule. That gap is the point
          // of having both fields.
          internetReachable: exposure === "Public" && chance(s + 74, 0.75),
          blastRadius: Math.floor(rand(s + 75) * 12),
          health: pick(HEALTH, s + 11),
          compliance: pick(COMPLIANCE, s + 12),
          level: 2,
          parentId: clusterId,
          hasChildren: false,
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

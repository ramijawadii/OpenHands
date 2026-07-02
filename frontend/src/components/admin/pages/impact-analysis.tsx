/* eslint-disable @typescript-eslint/no-explicit-any, i18next/no-literal-string, no-bitwise, no-param-reassign, no-continue, @typescript-eslint/no-use-before-define -- CloudGuard IAM Impact Analysis graph (Cytoscape; no KeyLines dep) */
import React from "react";
import {
  RotateCcw,
  Maximize2,
  AlertTriangle,
  ChevronRight,
  ArrowLeft,
  Lock,
  X,
  Star,
  Info,
  GitBranch,
  Expand,
  Minimize,
  Bot,
  Play,
  Copy,
  Check,
  ArrowUp,
  ArrowDown,
  Save,
  ChevronDown,
  Crosshair,
  Frame,
  Trash2,
} from "lucide-react";
import cytoscape from "cytoscape";
import fcose from "cytoscape-fcose";
import cognitoIcon from "thesvg/aws-amazon-cognito";
import roleIcon from "thesvg/aws-res-aws-identity-access-management-role";
import policyIcon from "thesvg/aws-res-aws-identity-access-management-permissions";
import s3Icon from "thesvg/aws-res-amazon-simple-storage-service-bucket";
import rdsIcon from "thesvg/aws-amazon-rds";
import dynamoIcon from "thesvg/aws-amazon-dynamodb";
import kmsIcon from "thesvg/aws-aws-key-management-service";
import secretsIcon from "thesvg/aws-aws-secrets-manager";
import ec2Icon from "thesvg/aws-amazon-ec2";
import lambdaIcon from "thesvg/aws-aws-lambda";
import {
  GraphNavigator,
  GraphMinimap,
  GraphWatermark,
  graphToolBtn,
  CHROME,
  DRAWER_W,
  MINZ,
  MAXZ,
  zoomToPct,
  pctToZoom,
  RemediationTimeline,
  remediationFor,
  LogList,
  logsFor,
  NotesPanel,
  useNotes,
  MultiFilter,
  MoreDetail,
} from "./graph-shell";

// ════════════════════════════════════════════════════════════════════════════
// §7.13 Identity Blast-Radius — Impact Analysis. A faithful re-build of the
// Cambridge Intelligence KeyLines "Impact Analysis" sample (no KeyLines dep) on
// Cytoscape + fcose, mapped to a real AWS IAM estate: Identity → Role → Policy →
// Resource. Node size scales with downstream blast radius (cube-root). Hover a
// node to isolate its access chain (everything else greys out but stays);
// filter by tier to spotlight a class of entities; drill into a node to expand
// its reach rightward, with a back-stack to step out one level at a time. White
// canvas + real thesvg AWS icons to match the IAM Explorer diagram. Built to
// stay smooth on production-scale graphs (texture-on-viewport, batched paints).
// ════════════════════════════════════════════════════════════════════════════

let fcoseReady = false;
function ensureFcose() {
  if (!fcoseReady) {
    (cytoscape as any).use(fcose);
    fcoseReady = true;
  }
}

const svgUri = (svg: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

// ── domain palette (KeyLines sample's four service colours) ───────────────────
const BG = "#ffffff";
const C_IDENTITY = "#2d86d4";
const C_ROLE = "#23b1c9";
const C_POLICY = "#16b8a6";
const C_RESOURCE = "#39b84e";
const C_ERROR = "#e0492f";
const C_WARN = "#d99a00";

type Tier = "identity" | "role" | "policy" | "resource";
const TIER_COLOUR: Record<Tier, string> = {
  identity: C_IDENTITY,
  role: C_ROLE,
  policy: C_POLICY,
  resource: C_RESOURCE,
};
const TIER_LABEL: Record<Tier, string> = {
  identity: "Identity",
  role: "Role",
  policy: "Policy",
  resource: "Resource",
};
const TIER_ORDER: Tier[] = ["identity", "role", "policy", "resource"];

// real thesvg AWS icons → data-URI (transparent nodes show the brand icon)
const ICON: Record<string, string> = {
  identity: svgUri(cognitoIcon.svg),
  role: svgUri(roleIcon.svg),
  policy: svgUri(policyIcon.svg),
  s3: svgUri(s3Icon.svg),
  rds: svgUri(rdsIcon.svg),
  dynamodb: svgUri(dynamoIcon.svg),
  kms: svgUri(kmsIcon.svg),
  secrets: svgUri(secretsIcon.svg),
  ec2: svgUri(ec2Icon.svg),
  lambda: svgUri(lambdaIcon.svg),
};

// golden star for marked nodes
const STAR_URI = svgUri(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#f5b301" stroke="#a9760a" stroke-width="1.2" stroke-linejoin="round"><polygon points="12,2 15,9 22,9 16.5,14 18.5,21 12,17 5.5,21 7.5,14 2,9 9,9"/></svg>',
);

type Alert = "error" | "warning" | undefined;
type IANode = {
  id: string;
  tier: Tier;
  kind: string; // icon key
  label: string;
  alert?: Alert;
  message?: string;
};
type IAEdge = { source: string; target: string };

// ── representative, real-world AWS IAM estate (Sample data) ───────────────────
// Deterministic builder — a multi-account prod/stage/dev estate with shared,
// over-exposed resources so the blast-radius story is meaningful.
function buildModel(): { nodes: IANode[]; edges: IAEdge[] } {
  let seed = 991;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  const some = <T,>(arr: T[], min: number, max: number): T[] => {
    const k = min + Math.floor(rnd() * (max - min + 1));
    const pool = [...arr];
    const out: T[] = [];
    for (let i = 0; i < k && pool.length; i += 1) {
      out.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
    }
    return out;
  };

  const ENVS = ["prod", "stage", "dev"];
  const RES_KINDS: { kind: string; noun: string }[] = [
    { kind: "s3", noun: "bucket" },
    { kind: "rds", noun: "rds" },
    { kind: "dynamodb", noun: "ddb" },
    { kind: "kms", noun: "key" },
    { kind: "secrets", noun: "secret" },
    { kind: "ec2", noun: "ec2" },
    { kind: "lambda", noun: "fn" },
  ];
  const RES_NAMES = [
    "customer-pii",
    "billing",
    "sessions",
    "audit-logs",
    "data-export",
    "analytics",
    "payments",
    "user-content",
    "model-artifacts",
    "config",
    "backups",
    "telemetry",
  ];

  const resources: IANode[] = [];
  let ri = 0;
  ENVS.forEach((env) => {
    RES_NAMES.forEach((name, i) => {
      const k = RES_KINDS[(i + ENVS.indexOf(env)) % RES_KINDS.length];
      resources.push({
        id: `res-${ri}`,
        tier: "resource",
        kind: k.kind,
        label: `${env}/${name}-${k.noun}`,
      });
      ri += 1;
    });
  });

  const POL_NAMES = [
    "ReadOnly",
    "ReadWrite",
    "FullAccess",
    "KMSDecrypt",
    "SecretsRead",
    "DataExport",
    "AdminAccess",
    "AssumeRole",
    "ListAll",
    "PutObject",
  ];
  const policies: IANode[] = [];
  ENVS.forEach((env) => {
    POL_NAMES.forEach((p, i) => {
      policies.push({
        id: `pol-${env}-${i}`,
        tier: "policy",
        kind: "policy",
        label: `${env}-${p}`,
      });
    });
  });

  const ROLE_NAMES = [
    "deploy",
    "data-eng",
    "sre",
    "ci-runner",
    "analyst",
    "read-only",
    "break-glass",
    "vendor",
    "backup",
    "lambda-exec",
  ];
  const roles: IANode[] = [];
  ENVS.forEach((env) => {
    ROLE_NAMES.forEach((r, i) => {
      roles.push({
        id: `role-${env}-${i}`,
        tier: "role",
        kind: "role",
        label: `${env}-${r}`,
      });
    });
  });

  const HUMANS = [
    "j.cooper",
    "m.lee",
    "p.nair",
    "a.khan",
    "l.rossi",
    "s.adeyemi",
    "d.park",
    "r.silva",
    "t.novak",
    "e.haddad",
  ];
  const SERVICES = [
    "svc-ci",
    "svc-scanner",
    "terraform",
    "github-oidc",
    "svc-backup",
    "svc-etl",
    "svc-billing",
    "svc-analytics",
  ];
  const identities: IANode[] = [
    ...HUMANS.map((h, i) => ({
      id: `id-h-${i}`,
      tier: "identity" as Tier,
      kind: "identity",
      label: h,
    })),
    ...SERVICES.map((s, i) => ({
      id: `id-s-${i}`,
      tier: "identity" as Tier,
      kind: "identity",
      label: s,
    })),
  ];

  const edges: IAEdge[] = [];
  const connect = (a: IANode[], b: IANode[], min: number, max: number) =>
    a.forEach((n) =>
      some(b, min, max).forEach((t) => {
        if (t.id !== n.id) edges.push({ source: n.id, target: t.id });
      }),
    );
  connect(identities, roles, 1, 3);
  connect(roles, policies, 1, 3);
  connect(policies, resources, 1, 4);

  // a handful of named, high-impact alert nodes (the red/yellow story)
  const set = (
    n: IANode | undefined,
    alert: Alert,
    label: string,
    message: string,
  ) => {
    if (n) {
      n.alert = alert;
      n.label = label;
      n.message = message;
    }
  };
  set(
    policies.find(
      (p) => p.label.endsWith("AdminAccess") && p.label.startsWith("prod"),
    ),
    "error",
    "prod-AdminAccess-*",
    "Wildcard Action:* on Resource:* — full account-takeover path",
  );
  set(
    roles.find((r) => r.label === "prod-break-glass"),
    "error",
    "prod-break-glass",
    "Standing privileged role with no session expiry",
  );
  set(
    resources.find((r) => r.label.includes("customer-pii")),
    "error",
    "prod/customer-pii-bucket",
    "Public bucket policy — reachable from external principals",
  );
  set(
    identities.find((i) => i.label === "svc-scanner"),
    "warning",
    "svc-scanner",
    "Service account with interactive console access",
  );
  set(
    policies.find((p) => p.label === "prod-DataExport"),
    "warning",
    "prod-DataExport",
    "Allows s3:GetObject across every data bucket",
  );
  set(
    roles.find((r) => r.label === "prod-vendor"),
    "warning",
    "prod-vendor",
    "External trust with broad permissions",
  );

  return {
    nodes: [...identities, ...roles, ...policies, ...resources],
    edges,
  };
}

const MODEL = buildModel();

// downstream reach (blast radius) for every node — drives node sizing
function downstreamCounts(): Record<string, number> {
  const adj: Record<string, string[]> = {};
  MODEL.edges.forEach((e) => {
    (adj[e.source] ||= []).push(e.target);
  });
  const out: Record<string, number> = {};
  MODEL.nodes.forEach((n) => {
    const seen = new Set<string>();
    const stack = [...(adj[n.id] || [])];
    while (stack.length) {
      const cur = stack.pop() as string;
      if (seen.has(cur)) continue;
      seen.add(cur);
      (adj[cur] || []).forEach((x) => stack.push(x));
    }
    out[n.id] = seen.size;
  });
  return out;
}
const REACH = downstreamCounts();

const NODE_BY_ID: Record<string, IANode> = Object.fromEntries(
  MODEL.nodes.map((n) => [n.id, n]),
);
// direct neighbours of a node, split by direction (for the details drawer)
function relationsOf(id: string): { up: IANode[]; down: IANode[] } {
  const up: IANode[] = [];
  const down: IANode[] = [];
  MODEL.edges.forEach((e) => {
    if (e.source === id && NODE_BY_ID[e.target])
      down.push(NODE_BY_ID[e.target]);
    if (e.target === id && NODE_BY_ID[e.source]) up.push(NODE_BY_ID[e.source]);
  });
  return { up, down };
}

// full transitive dependency chain of a node (upstream + downstream), tier-ordered
// — the navigable list behind "Expand dependency chain".
function chainNodes(id: string): IANode[] {
  const outAdj: Record<string, string[]> = {};
  const inAdj: Record<string, string[]> = {};
  MODEL.edges.forEach((e) => {
    (outAdj[e.source] ||= []).push(e.target);
    (inAdj[e.target] ||= []).push(e.source);
  });
  const seen = new Set<string>();
  const walk = (adj: Record<string, string[]>) => {
    const stack = [...(adj[id] || [])];
    while (stack.length) {
      const cur = stack.pop() as string;
      if (seen.has(cur) || cur === id) continue;
      seen.add(cur);
      (adj[cur] || []).forEach((x) => stack.push(x));
    }
  };
  walk(outAdj);
  walk(inAdj);
  return [...seen]
    .map((x) => NODE_BY_ID[x])
    .filter(Boolean)
    .sort((a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier));
}

// a recallable saved view — a named snapshot of viewport + emphasis + mode +
// the drill stack (so an expanded-dependency view is re-entered, not just lit)
type SavedView = {
  id: string;
  name: string;
  kind: "full" | "chain" | "issue" | "node" | "catalog";
  view: "graph" | "findings" | "issues"; // which mode was open
  stack: string[]; // drill-in path (expanded dependency); [] = whole graph
  zoom: number;
  pan: { x: number; y: number };
  chainIds?: string[];
  path?: string[];
  spot?: string | null;
  ts: number;
};
// human-readable "data reference" for a saved view (what it points at)
function savedViewRef(v: SavedView): string {
  if (v.stack.length)
    return `Expanded dependency · ${NODE_BY_ID[v.stack[v.stack.length - 1]]?.label ?? v.stack[v.stack.length - 1]}`;
  if (v.kind === "catalog")
    return v.view === "issues" ? "Issues catalog" : "Findings catalog";
  if (v.kind === "full") return "Entire graph";
  if (v.kind === "issue")
    return `Attack path · ${v.path?.length ?? 0} resources`;
  if (v.kind === "node") return `Resource · ${v.spot ?? "—"}`;
  return `Dependency chain · ${v.chainIds?.length ?? 0} resources`;
}

// directional, degree-bounded chain: dir = downstream (data flows OUT) or
// upstream (data flows IN); degree 1 / 2 / 0(=full). Returns the node-id set.
type ChainDir = "down" | "up";
type ChainDeg = 1 | 2 | 0;
function chainDir(id: string, dir: ChainDir, degree: ChainDeg): Set<string> {
  const adj: Record<string, string[]> = {};
  MODEL.edges.forEach((e) => {
    if (dir === "down") (adj[e.source] ||= []).push(e.target);
    else (adj[e.target] ||= []).push(e.source);
  });
  const out = new Set<string>([id]);
  let frontier = [id];
  let d = 0;
  const maxD = degree === 0 ? Infinity : degree;
  while (frontier.length && d < maxD) {
    const next: string[] = [];
    frontier.forEach((c) =>
      (adj[c] || []).forEach((x) => {
        if (!out.has(x)) {
          out.add(x);
          next.push(x);
        }
      }),
    );
    frontier = next;
    d += 1;
  }
  return out;
}

// ── Findings (single-resource problems) + Issues (attack paths) ───────────────
type Severity = "Critical" | "High" | "Medium" | "Low" | "Informational";
const SEV_ORDER: Severity[] = [
  "Critical",
  "High",
  "Medium",
  "Low",
  "Informational",
];
const SEV_COLOUR: Record<Severity, string> = {
  Critical: "#e0492f",
  High: "#f0733a",
  Medium: "#d99a00",
  Low: "#3f9bd6",
  Informational: "#8a96a8",
};
type FStatus = "Open" | "In remediation" | "Resolved" | "Suppressed";
type IStatus =
  | "Active"
  | "Partially remediated"
  | "Blocked (path broken)"
  | "Suppressed";

type Finding = {
  id: string;
  nodeId: string;
  title: string;
  category: string; // what is it
  severity: Severity;
  resourceType: string;
  cloud: string;
  account: string;
  region: string;
  vpc: string;
  framework: string;
  controlId: string;
  owner: string;
  suppressed: boolean;
  firstSeen: string;
  lastSeen: string;
  ageDays: number;
  status: FStatus;
};
type Issue = {
  id: string;
  title: string;
  path: string[]; // node ids, entry → target
  attackType: string;
  risk: Severity;
  entryPoint: string;
  target: string;
  hopCount: number;
  crossesAccount: boolean;
  crossesVpc: boolean;
  involvesPublic: boolean;
  exploitability: string;
  findingIds: string[];
  minSeverity: Severity;
  findingTypes: string[];
  hasActiveExploit: boolean;
  status: IStatus;
};

const RES_TYPE: Record<string, string> = {
  ec2: "EC2 / VM",
  s3: "S3 / Blob",
  lambda: "Lambda / Function",
  role: "IAM Role / Policy",
  policy: "IAM Role / Policy",
  identity: "IAM Role / Policy",
  rds: "RDS / Database",
  dynamodb: "RDS / Database",
  kms: "Secret / Key",
  secrets: "Secret / Key",
};

function buildFindings(): Finding[] {
  let s = 42;
  const r = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
  const REGIONS = ["us-east-1", "us-west-2", "eu-west-1"];
  const FW = ["SOC 2", "CIS AWS 1.5", "NIST 800-53"];
  const TEAMS = ["platform", "data-eng", "security", "payments"];
  const daysAgo = (d: number) => {
    const dt = new Date(2026, 6, 1);
    dt.setDate(dt.getDate() - d);
    return dt.toISOString().slice(0, 10);
  };
  // curated, node-anchored findings (the flagged story) + a spread of resources
  const seeds: {
    label: string;
    category: string;
    severity: Severity;
    status: FStatus;
  }[] = [
    {
      label: "prod/customer-pii-bucket",
      category: "Public bucket",
      severity: "Critical",
      status: "Open",
    },
    {
      label: "prod-AdminAccess-*",
      category: "Over-permissioned role",
      severity: "Critical",
      status: "Open",
    },
    {
      label: "prod-break-glass",
      category: "Over-permissioned role",
      severity: "High",
      status: "In remediation",
    },
    {
      label: "svc-scanner",
      category: "Missing MFA",
      severity: "High",
      status: "Open",
    },
    {
      label: "prod-DataExport",
      category: "Misconfiguration",
      severity: "High",
      status: "Open",
    },
    {
      label: "prod-vendor",
      category: "Over-permissioned role",
      severity: "Medium",
      status: "Open",
    },
  ];
  const out: Finding[] = [];
  const add = (
    node: IANode | undefined,
    category: string,
    severity: Severity,
    status: FStatus,
  ) => {
    if (!node) return;
    const age = 3 + Math.floor(r() * 180);
    const env = node.label.split(/[-/]/)[0];
    out.push({
      id: `F-${1000 + out.length}`,
      nodeId: node.id,
      title: `${category} — ${node.label}`,
      category,
      severity,
      resourceType: RES_TYPE[node.kind] || "—",
      cloud: "AWS",
      account: `acct-${["prod", "stage", "dev"].includes(env) ? env : "prod"}-9021`,
      region: pick(REGIONS),
      vpc: `demo-vpc / ${pick(["private-1a", "private-1f", "public-1a"])}`,
      framework: pick(FW),
      controlId: `${pick(["CC6.1", "1.14", "AC-6", "SC-13", "IA-2"])}`,
      owner: pick(TEAMS),
      suppressed: status === "Suppressed",
      firstSeen: daysAgo(age),
      lastSeen: daysAgo(Math.floor(r() * 3)),
      ageDays: age,
      status,
    });
  };
  seeds.forEach((sd) =>
    add(
      MODEL.nodes.find((n) => n.label === sd.label),
      sd.category,
      sd.severity,
      sd.status,
    ),
  );
  // spread more findings across representative resources
  const cats = [
    "Misconfiguration",
    "Vulnerability (CVE)",
    "Exposed secret",
    "Unencrypted storage",
    "Public bucket",
  ];
  const resPool = MODEL.nodes.filter(
    (n) => n.tier === "resource" && !out.some((f) => f.nodeId === n.id),
  );
  for (let i = 0; i < 10 && i < resPool.length; i += 1) {
    add(
      resPool[Math.floor(r() * resPool.length)],
      pick(cats),
      pick(SEV_ORDER),
      pick<FStatus>([
        "Open",
        "Open",
        "In remediation",
        "Resolved",
        "Suppressed",
      ]),
    );
  }
  return out;
}
const FINDINGS = buildFindings();
const FINDING_BY_NODE: Record<string, Finding> = {};
FINDINGS.forEach((f) => {
  if (!FINDING_BY_NODE[f.nodeId]) FINDING_BY_NODE[f.nodeId] = f;
});

// path from an upstream identity down to a node (entry → target)
function pathTo(id: string): string[] {
  const parent: Record<string, string> = {};
  const seen = new Set([id]);
  const q = [id];
  let entry: string | null = null;
  while (q.length) {
    const cur = q.shift() as string;
    if (NODE_BY_ID[cur]?.tier === "identity") {
      entry = cur;
      break;
    }
    MODEL.edges.forEach((e) => {
      if (e.target === cur && !seen.has(e.source)) {
        seen.add(e.source);
        parent[e.source] = cur;
        q.push(e.source);
      }
    });
  }
  if (!entry) return [id];
  const path = [entry];
  let c = entry;
  while (parent[c]) {
    c = parent[c];
    path.push(c);
  }
  return path;
}

function buildIssues(): Issue[] {
  let s = 77;
  const r = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
  const ATTACK = [
    "Internet exposure → sensitive data",
    "Privilege escalation path",
    "Lateral movement path",
    "Data exfiltration path",
    "Supply chain path",
  ];
  const ENTRY = [
    "Internet-facing",
    "Compromised identity",
    "Vulnerable workload",
    "Exposed secret",
    "Third-party / SaaS",
  ];
  const TARGET: Record<string, string> = {
    s3: "Sensitive data store",
    rds: "Sensitive data store",
    dynamodb: "Sensitive data store",
    kms: "Secrets manager",
    secrets: "Secrets manager",
    ec2: "Production workload",
    lambda: "Production workload",
  };
  const targetFor = (kind: string) => TARGET[kind] || "Admin / root role";
  // anchor issues on the highest-impact findings
  const anchors = FINDINGS.filter((f) =>
    ["Critical", "High"].includes(f.severity),
  ).slice(0, 6);
  return anchors.map((f, i) => {
    const path = pathTo(f.nodeId);
    const findingIds = FINDINGS.filter((x) => path.includes(x.nodeId)).map(
      (x) => x.id,
    );
    const sevs = findingIds
      .map((fid) => FINDINGS.find((x) => x.id === fid)!.severity)
      .sort((a, b) => SEV_ORDER.indexOf(a) - SEV_ORDER.indexOf(b));
    const node = NODE_BY_ID[f.nodeId];
    return {
      id: `ISS-${200 + i}`,
      title: `${ENTRY[i % ENTRY.length]} → ${node?.label}`,
      path,
      attackType: ATTACK[i % ATTACK.length],
      risk: f.severity,
      entryPoint: ENTRY[i % ENTRY.length],
      target: targetFor(node?.kind || ""),
      hopCount: Math.max(1, path.length - 1),
      crossesAccount: r() > 0.6,
      crossesVpc: r() > 0.5,
      involvesPublic: f.category === "Public bucket" || r() > 0.7,
      exploitability: r() > 0.5 ? "Known CVE on path" : "No known exploit",
      findingIds,
      minSeverity: sevs[sevs.length - 1] || f.severity,
      findingTypes: Array.from(
        new Set(
          findingIds.map((fid) => FINDINGS.find((x) => x.id === fid)!.category),
        ),
      ),
      hasActiveExploit: r() > 0.6,
      status: (
        ["Active", "Active", "Partially remediated", "Suppressed"] as IStatus[]
      )[Math.floor(r() * 4)],
    };
  });
}
const ISSUES = buildIssues();
// issues whose attack-path passes through a given node (context-menu tags)
function issuesForNode(id: string): Issue[] {
  return ISSUES.filter((i) => i.path.includes(id));
}

// ── catalog multi-select filter groups + matchers ────────────────────────────
function ageBucket(d: number): string {
  if (d <= 7) return "≤ 7 days";
  if (d <= 30) return "8–30 days";
  return "> 30 days";
}
const FINDING_FILTER_GROUPS = [
  { key: "severity", label: "Severity", options: SEV_ORDER as string[] },
  {
    key: "status",
    label: "Status",
    options: ["Open", "In remediation", "Resolved", "Suppressed"],
  },
  {
    key: "category",
    label: "Category",
    options: Array.from(new Set(FINDINGS.map((f) => f.category))),
  },
  { key: "env", label: "Environment", options: ["prod", "stage", "dev"] },
  { key: "cloud", label: "Cloud provider", options: ["AWS"] },
  { key: "age", label: "Age", options: ["≤ 7 days", "8–30 days", "> 30 days"] },
];
const ISSUE_FILTER_GROUPS = [
  {
    key: "risk",
    label: "Path risk",
    options: ["Critical", "High", "Medium", "Low"],
  },
  {
    key: "status",
    label: "Status",
    options: [
      "Active",
      "Partially remediated",
      "Blocked (path broken)",
      "Suppressed",
    ],
  },
  {
    key: "attack",
    label: "Attack type",
    options: Array.from(new Set(ISSUES.map((i) => i.attackType))),
  },
  {
    key: "exploit",
    label: "Exploitability",
    options: ["Known CVE on path", "No known exploit"],
  },
];
// group selected "group:value" keys by group
function selByGroup(sel: Set<string>): Record<string, Set<string>> {
  const out: Record<string, Set<string>> = {};
  sel.forEach((k) => {
    const i = k.indexOf(":");
    const g = k.slice(0, i);
    (out[g] ||= new Set()).add(k.slice(i + 1));
  });
  return out;
}
function matchFinding(f: Finding, sel: Set<string>): boolean {
  if (!sel.size) return true;
  const g = selByGroup(sel);
  if (g.severity && !g.severity.has(f.severity)) return false;
  if (g.status && !g.status.has(f.status)) return false;
  if (g.category && !g.category.has(f.category)) return false;
  if (g.env && ![...g.env].some((e) => f.account.includes(e))) return false;
  if (g.cloud && !g.cloud.has(f.cloud)) return false;
  if (g.age && !g.age.has(ageBucket(f.ageDays))) return false;
  return true;
}
function matchIssue(i: Issue, sel: Set<string>): boolean {
  if (!sel.size) return true;
  const g = selByGroup(sel);
  if (g.risk && !g.risk.has(i.risk)) return false;
  if (g.status && !g.status.has(i.status)) return false;
  if (g.attack && !g.attack.has(i.attackType)) return false;
  if (g.exploit && !g.exploit.has(i.exploitability)) return false;
  return true;
}

function elements() {
  const els: any[] = [];
  MODEL.nodes.forEach((n) => {
    const reach = REACH[n.id] || 0;
    const scale = reach > 0 ? reach ** (1 / 3) : 1;
    els.push({
      data: {
        id: n.id,
        tier: n.tier,
        kind: n.kind,
        label: n.label,
        message: n.message || "",
        alert: n.alert || "",
        reach,
        baseSize: Math.round(30 + scale * 8),
      },
    });
  });
  MODEL.edges.forEach((e, i) => {
    els.push({
      data: {
        id: `e${i}`,
        source: e.source,
        target: e.target,
        srcTier: MODEL.nodes.find((n) => n.id === e.source)?.tier,
      },
    });
  });
  return els;
}

function baseStyle(): any[] {
  const tint = (n: any) => TIER_COLOUR[n.data("tier") as Tier];
  return [
    {
      selector: "node",
      style: {
        width: "data(baseSize)",
        height: "data(baseSize)",
        shape: "round-rectangle",
        "corner-radius": "6",
        // light tier-tinted disc + tier border + real AWS brand icon on top
        "background-color": tint,
        "background-opacity": 0.12,
        "background-image": (n: any) => ICON[n.data("kind")],
        "background-fit": "contain",
        "background-clip": "none",
        "background-width": "66%",
        "background-height": "66%",
        "border-width": 1.5,
        "border-color": tint,
        label: "",
        "transition-property": "opacity",
        "transition-duration": "120ms",
      },
    },
    {
      selector: "edge",
      style: {
        width: 1.3,
        "line-color": (e: any) => TIER_COLOUR[e.data("srcTier") as Tier],
        "target-arrow-color": (e: any) =>
          TIER_COLOUR[e.data("srcTier") as Tier],
        "target-arrow-shape": "triangle",
        "arrow-scale": 0.7,
        "curve-style": "straight",
        opacity: 0.5,
      },
    },
    // alerts colouring
    {
      selector: "node.err",
      style: { "background-color": C_ERROR, "border-color": C_ERROR },
    },
    {
      selector: "node.warn",
      style: { "background-color": C_WARN, "border-color": C_WARN },
    },
    { selector: "node.muted", style: { "background-opacity": 0.05 } },
    {
      selector: "edge.err",
      style: {
        "line-color": C_ERROR,
        "target-arrow-color": C_ERROR,
        opacity: 0.85,
      },
    },
    {
      selector: "edge.warn",
      style: {
        "line-color": C_WARN,
        "target-arrow-color": C_WARN,
        opacity: 0.7,
      },
    },
    // golden star on marked nodes (layered over the tier icon)
    {
      selector: "node.marked",
      style: {
        "background-image": (n: any) => [ICON[n.data("kind")], STAR_URI],
        "background-width": ["66%", "40%"],
        "background-height": ["66%", "40%"],
        "background-position-x": ["50%", "96%"],
        "background-position-y": ["50%", "4%"],
        "background-fit": ["contain", "contain"],
        "background-clip": ["none", "none"],
      },
    },
    // active access-chain emphasis
    {
      selector: "node.chain",
      style: { "border-width": 3, "border-color": "#10221c" },
    },
    { selector: "edge.chain", style: { width: 2.2, opacity: 0.95 } },
    // single-node spotlight — a dashed focus box (drawer node navigation)
    {
      selector: "node.focusbox",
      style: {
        "border-width": 3,
        "border-color": "#2d86d4",
        "border-style": "dashed",
        "background-opacity": 0.22,
      },
    },
    // hover / filter / lock de-emphasis — LAST so it wins over alert colouring
    { selector: "node.shadow", style: { opacity: 0.1 } },
    { selector: "edge.shadow", style: { opacity: 0.04 } },
    {
      selector: "node.picked",
      style: { "border-width": 4, "border-color": "#10221c" },
    },
    // focus (drill-in) hierarchy — clean labelled rectangles
    {
      selector: "node.rect",
      style: {
        shape: "round-rectangle",
        "corner-radius": "8",
        width: 236,
        height: 48,
        "background-color": tint,
        "background-opacity": 0.14,
        "background-image": (n: any) => ICON[n.data("kind")],
        "background-fit": "contain",
        "background-clip": "none",
        "background-width": "26px",
        "background-height": "26px",
        "background-position-x": "14px",
        "background-position-y": "50%",
        "border-width": 1.5,
        "border-color": tint,
        label: (n: any) => n.data("label"),
        color: "var(--cg-graph-label, #10221c)",
        "font-size": 12.5,
        "font-weight": 600,
        "text-valign": "center",
        "text-halign": "center",
        "text-margin-x": 22,
        "text-max-width": "168",
        "text-wrap": "ellipsis",
      },
    },
    {
      selector: "node.rect.err",
      style: { "background-color": C_ERROR, "border-color": C_ERROR },
    },
    {
      selector: "node.rect.warn",
      style: { "background-color": C_WARN, "border-color": C_WARN },
    },
    {
      selector: "edge.fedge",
      style: {
        "curve-style": "round-taxi",
        "taxi-direction": "horizontal",
        "taxi-turn": "50%",
        "taxi-turn-min-distance": "12px",
        radius: 18,
        width: 1.8,
        opacity: 0.7,
      },
    },
  ];
}

const ALERTS_W = DRAWER_W; // right drawer width (graph area shrinks by this)

export function ImpactAnalysis() {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const cyRef = React.useRef<any>(null);
  const [view, setView] = React.useState<"graph" | "findings" | "issues">(
    "graph",
  );
  const [stack, setStack] = React.useState<string[]>([]);
  const [, setSel] = React.useState<IANode | null>(null);
  const [filters, setFilters] = React.useState<Set<Tier>>(new Set());
  const [zoomPct, setZoomPct] = React.useState(40);
  const [showMini, setShowMini] = React.useState(true);
  const [hoverInfo, setHoverInfo] = React.useState<IANode | null>(null);
  // minimap is split: dots + graph bbox change only on layout (recomputeMini);
  // the viewport rect updates cheaply on every pan/zoom (updateFrame). This stops
  // the per-frame re-read of every node position that was glitching the pan.
  const [dots, setDots] = React.useState<{ x: number; y: number; a: string }[]>(
    [],
  );
  const bbRef = React.useRef({ x: 0, y: 0, w: 1, h: 1 });
  const [frame, setFrame] = React.useState<{
    bb: { x: number; y: number; w: number; h: number };
    view: { x: number; y: number; w: number; h: number };
  } | null>(null);

  // right-side auxiliary drawer (node details · mark · marked list)
  const [panel, setPanel] = React.useState<{
    type: "details" | "mark" | "marklist";
    nodeId?: string;
  } | null>(null);
  // marked nodes → note (persisted in state; golden star on the node)
  const [marked, setMarked] = React.useState<
    Record<string, { note: string; ts: number }>
  >({});
  // recallable saved views (client-side; Sample)
  const [saved, setSaved] = React.useState<SavedView[]>([]);
  const [saveMenu, setSaveMenu] = React.useState(false);
  const [savedOpen, setSavedOpen] = React.useState(false);
  const [picking, setPicking] = React.useState(false);
  const pickingRef = React.useRef(false);
  pickingRef.current = picking;
  // locked view — chain (path undefined) or a specific issue attack-path
  const [locked, setLocked] = React.useState<{
    id: string;
    path?: string[];
    label: string;
  } | null>(null);
  const [ctx, setCtx] = React.useState<{
    x: number;
    y: number;
    node: IANode;
  } | null>(null);
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const [isFull, setIsFull] = React.useState(false);
  const [catalogKey, setCatalogKey] = React.useState(0);
  // context-menu tag → jump the catalog drawer straight to a finding / issue
  const [seed, setSeed] = React.useState<{
    kind: "finding" | "issue";
    id: string;
  } | null>(null);

  const focusId = stack.length ? stack[stack.length - 1] : null;
  const viewRef = React.useRef(view);
  viewRef.current = view;
  const hoverRef = React.useRef<string | null>(null);
  const pinnedRef = React.useRef<string | null>(null); // finding row / dep-chain pin
  const chainSetRef = React.useRef<Set<string> | null>(null); // directional dep-chain
  const pathRef = React.useRef<string[] | null>(null); // issue attack-path spotlight
  const spotRef = React.useRef<string | null>(null); // single-node spotlight (dashed box)
  const lockedRef = React.useRef<{
    id: string;
    path?: string[];
    label: string;
  } | null>(null);
  lockedRef.current = locked;
  const ctxRef = React.useRef<string | null>(null);
  const filterRef = React.useRef(filters);
  filterRef.current = filters;
  // node the graph tooltip points at (single-node spotlight)
  const [tip, setTip] = React.useState<{ id: string } | null>(null);
  const tipRef = React.useRef<{ id: string } | null>(null);
  tipRef.current = tip;
  const [tipPos, setTipPos] = React.useState<{ x: number; y: number } | null>(
    null,
  );
  const updateFrameRef = React.useRef<(() => void) | null>(null);

  // ── emphasis: one place decides which elements are lit vs shadowed. Priority:
  // context-menu spotlight → locked view → hover → pinned (alert/chain) → filter.
  const applyEmphasis = React.useCallback(() => {
    const cy = cyRef.current;
    if (!cy) return;
    const chainSet = (id: string) => {
      const n = cy.getElementById(id);
      return new Set<string>(
        n
          .predecessors()
          .union(n.successors())
          .union(n)
          .nodes()
          .map((x: any) => x.id()),
      );
    };
    let active: Set<string> | null = null;
    let chain = false;
    let boxId: string | null = null; // single node → dashed focus box
    if (ctxRef.current) {
      active = new Set([ctxRef.current]); // menu spotlight: just the node
    } else if (lockedRef.current) {
      active = lockedRef.current.path
        ? new Set(lockedRef.current.path)
        : chainSet(lockedRef.current.id);
      chain = true;
    } else if (pathRef.current) {
      // issue attack-path — keep the whole path lit; if a node inside it is
      // being inspected, box THAT node (the path selection is never lost).
      active = new Set(pathRef.current);
      chain = true;
      boxId = spotRef.current;
    } else if (spotRef.current) {
      active = new Set([spotRef.current]); // single-resource finding / node view
      boxId = spotRef.current;
    } else if (hoverRef.current) {
      active = chainSet(hoverRef.current);
      chain = true;
    } else if (chainSetRef.current) {
      active = chainSetRef.current; // directional / degree-bounded dep-chain
      chain = true;
    } else if (pinnedRef.current) {
      active = chainSet(pinnedRef.current);
      chain = true;
    } else if (filterRef.current.size) {
      active = new Set(
        cy
          .nodes()
          .filter((x: any) => filterRef.current.has(x.data("tier") as Tier))
          .map((x: any) => x.id()),
      );
    }
    cy.batch(() => {
      cy.elements().removeClass("shadow chain focusbox");
      if (!active) return;
      cy.nodes().forEach((n: any) => {
        if (!active!.has(n.id())) n.addClass("shadow");
        else if (chain) n.addClass("chain");
      });
      if (boxId) cy.getElementById(boxId).addClass("focusbox");
      cy.edges().forEach((e: any) => {
        const inA =
          active!.has(e.source().id()) && active!.has(e.target().id());
        if (!inA) e.addClass("shadow");
        else if (chain) e.addClass("chain");
      });
    });
  }, []);

  // pin a node's access path (alert row / dep-chain menu) — graph stays put.
  const emphasize = React.useCallback(
    (id: string | null) => {
      hoverRef.current = id ?? pinnedRef.current;
      applyEmphasis();
    },
    [applyEmphasis],
  );

  // ── build chart once ──────────────────────────────────────────────────────
  React.useEffect(() => {
    ensureFcose();
    if (!ref.current) return undefined;
    const cy = (cytoscape as any)({
      container: ref.current,
      elements: elements(),
      style: baseStyle(),
      minZoom: MINZ,
      maxZoom: MAXZ,
      wheelSensitivity: 0.35,
      boxSelectionEnabled: false,
      autoungrabify: true,
      autounselectify: true,
      // crisp, glitch-free panning: render edges live (no hide/texture swap)
      textureOnViewport: false,
      hideEdgesOnViewport: false,
      motionBlur: false,
      layout: {
        name: "fcose",
        quality: "default",
        animate: true,
        animationDuration: 520,
        nodeRepulsion: 9000,
        idealEdgeLength: 64,
      },
    });
    cyRef.current = cy;

    const nodeInfo = (t: any): IANode => ({
      id: t.id(),
      tier: t.data("tier"),
      kind: t.data("kind"),
      label: t.data("label"),
      alert: t.data("alert") || undefined,
      message: t.data("message") || undefined,
    });

    cy.on("mouseover", "node", (e: any) => {
      setHoverInfo(nodeInfo(e.target));
      // lock / context menu / a catalog selection own the emphasis — a graph
      // hover must not drop the current selection. Hover only drives the graph.
      if (lockedRef.current || ctxRef.current || pathRef.current) return;
      if (viewRef.current !== "graph") return;
      hoverRef.current = e.target.id();
      applyEmphasis();
    });
    cy.on("mouseout", "node", () => {
      setHoverInfo(null);
      if (lockedRef.current || ctxRef.current || pathRef.current) return;
      if (viewRef.current !== "graph") return;
      hoverRef.current = null;
      applyEmphasis(); // falls back to pinned / filter
    });
    cy.on("tap", "node", (e: any) => {
      const id = e.target.id();
      // picker mode: open the node's context menu so the operator can choose
      // WHICH view to save (a dependency chain + its submenu, or an issue chain)
      if (pickingRef.current) {
        const rp = e.renderedPosition || e.target.renderedPosition();
        const info = nodeInfo(e.target);
        ctxRef.current = id;
        setCtx({ x: rp.x, y: rp.y, node: info });
        setSel(info);
        setPicking(false);
        applyEmphasis();
        return;
      }
      if (lockedRef.current) return; // locked: no drilling
      setSel(nodeInfo(e.target));
      if (e.target.data("reach") > 0) {
        setStack((s) => (s[s.length - 1] === id ? s : [...s, id]));
      }
    });
    cy.on("tap", (e: any) => {
      if (e.target === cy) {
        setCtx(null);
        ctxRef.current = null;
        if (lockedRef.current) return;
        setSel(null);
        setStack([]);
        // clear a graph-pinned chain / issue-path / spotlight
        pinnedRef.current = null;
        chainSetRef.current = null;
        pathRef.current = null;
        spotRef.current = null;
        setTip(null);
        applyEmphasis();
      }
    });
    // right-click → context menu; spotlight the node, shadow the whole graph
    cy.on("cxttap", "node", (e: any) => {
      e.originalEvent?.preventDefault?.();
      const info = nodeInfo(e.target);
      const rp = e.renderedPosition || e.target.renderedPosition();
      ctxRef.current = info.id;
      setCtx({ x: rp.x, y: rp.y, node: info });
      setSel(info);
      applyEmphasis();
    });

    // cheap per-frame update: just the zoom read-out + minimap viewport rect
    let raf = 0;
    const updateFrame = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        setZoomPct(zoomToPct(cy.zoom()));
        const ext = cy.extent();
        setFrame({
          bb: bbRef.current,
          view: { x: ext.x1, y: ext.y1, w: ext.w, h: ext.h },
        });
        // keep the graph tooltip glued to the spotlit node (skip if hidden)
        if (tipRef.current) {
          const n = cy.getElementById(tipRef.current.id);
          if (n && n.length && n.visible()) {
            const rp = n.renderedPosition();
            const h = n.renderedHeight();
            setTipPos({ x: rp.x, y: rp.y - h / 2 });
          } else {
            setTipPos(null);
          }
        }
      });
    };
    updateFrameRef.current = updateFrame;
    // expensive update: re-read node dots + graph bbox — only when layout changes.
    // Cap the dot count so the minimap SVG stays cheap on production-scale graphs;
    // alert nodes are always kept, the rest are sampled.
    const recomputeMini = () => {
      const vis = cy.nodes(":visible");
      const CAP = 600;
      const step = vis.length > CAP ? Math.ceil(vis.length / CAP) : 1;
      const next: { x: number; y: number; a: string }[] = [];
      vis.forEach((n: any, i: number) => {
        const a = n.data("alert");
        if (step === 1 || a || i % step === 0) {
          const p = n.position();
          next.push({ x: p.x, y: p.y, a });
        }
      });
      const bb = cy.elements(":visible").boundingBox();
      bbRef.current = { x: bb.x1, y: bb.y1, w: bb.w, h: bb.h };
      setDots(next);
      updateFrame();
    };
    cy.on("pan zoom", updateFrame);
    cy.on("layoutstop", recomputeMini);
    cy.ready(() => setTimeout(recomputeMini, 250));
    return () => {
      if (raf) cancelAnimationFrame(raf);
      cy.destroy();
    };
  }, [applyEmphasis]);

  // ── filter re-emphasis ────────────────────────────────────────────────────
  React.useEffect(() => {
    applyEmphasis();
  }, [filters, applyEmphasis]);

  // reposition the graph tooltip whenever the spotlit node changes
  React.useEffect(() => {
    if (!tip) {
      setTipPos(null);
      return;
    }
    updateFrameRef.current?.();
  }, [tip]);

  // ── fullscreen: sync state, resize the renderer + animate-fit to the new box ─
  React.useEffect(() => {
    const onFs = () => {
      const full = !!document.fullscreenElement;
      setIsFull(full);
      const cy = cyRef.current;
      // let the viewport settle, resize the canvas, then scale the graph in
      setTimeout(() => {
        cy?.resize();
        cy?.animate(
          { fit: { padding: full ? 70 : 40 } },
          { duration: 420, easing: "ease-in-out-cubic" },
        );
      }, 90);
    };
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  // ── switching mode clears any catalog selection; drawer resizes the canvas ──
  const rightOpen = view !== "graph" || panel !== null;
  React.useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return undefined;
    if (view === "graph" && !locked) {
      pinnedRef.current = null;
      pathRef.current = null;
      spotRef.current = null;
      setTip(null);
      hoverRef.current = null;
      applyEmphasis();
    }
    // let the width transition run, then sync the renderer to the new size
    const t = setTimeout(() => cy.resize(), 280);
    return () => clearTimeout(t);
  }, [view, rightOpen, locked, applyEmphasis]);

  // ── marked nodes → golden star class on the graph ─────────────────────────
  React.useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.batch(() => {
      cy.nodes().forEach((n: any) => {
        if (marked[n.id()]) n.addClass("marked");
        else n.removeClass("marked");
      });
    });
  }, [marked]);

  // ── lock: apply the chain + Escape-to-exit ────────────────────────────────
  React.useEffect(() => {
    applyEmphasis();
    if (!locked) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLocked(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [locked, applyEmphasis]);

  // ── context menu: Escape / scroll closes it ───────────────────────────────
  React.useEffect(() => {
    if (!ctx) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setCtx(null);
        ctxRef.current = null;
        applyEmphasis();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ctx, applyEmphasis]);

  // ── focus (drill-in) vs network ───────────────────────────────────────────
  React.useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.nodes().removeClass("picked rect");
    cy.edges().removeClass("fedge");
    if (!focusId) {
      hoverRef.current = null;
      cy.batch(() => {
        cy.elements().style("display", "element");
        cy.elements().removeClass("shadow chain");
      });
      cy.layout({
        name: "fcose",
        animate: true,
        animationDuration: 520,
        animationEasing: "ease-in-out-cubic",
        nodeRepulsion: 9000,
        idealEdgeLength: 64,
      }).run();
      return;
    }
    const root = cy.getElementById(focusId);
    // expand strictly rightward from the source: downstream reach only
    const keep = root.successors().union(root);
    const kept = keep.nodes();

    // longest-path rank from the root → strict left→right columns
    const rank: Record<string, number> = { [root.id()]: 0 };
    TIER_ORDER.forEach(() => {
      keep.edges().forEach((e: any) => {
        const s = e.source().id();
        const t = e.target().id();
        if (rank[s] !== undefined)
          rank[t] = Math.max(rank[t] ?? 0, rank[s] + 1);
      });
    });

    const COL_GAP = 340;
    const ROW_GAP = 64;
    const cols: any[][] = [];
    kept.forEach((n: any) => {
      const r = rank[n.id()] ?? 0;
      (cols[r] ||= []).push(n);
    });
    const rowOf: Record<string, number> = {};
    const positions: Record<string, { x: number; y: number }> = {};
    cols.forEach((list, col) => {
      if (col > 0) {
        list.sort((a: any, b: any) => {
          const bary = (nd: any) => {
            const ps = nd.incomers("node").filter((p: any) => keep.contains(p));
            if (!ps.length) return Number.MAX_SAFE_INTEGER;
            let s = 0;
            ps.forEach((p: any) => {
              s += rowOf[p.id()] ?? 0;
            });
            return s / ps.length;
          };
          return bary(a) - bary(b);
        });
      }
      const offset = ((list.length - 1) * ROW_GAP) / 2;
      list.forEach((n: any, i: number) => {
        rowOf[n.id()] = i;
        positions[n.id()] = { x: col * COL_GAP, y: i * ROW_GAP - offset };
      });
    });

    cy.batch(() => {
      cy.elements().style("display", "none");
      cy.elements().removeClass("shadow chain");
      keep.style("display", "element");
      keep.nodes().addClass("rect");
      keep.edges().addClass("fedge");
      root.addClass("picked");
    });
    keep
      .layout({
        name: "preset",
        positions: (n: any) => positions[n.id()],
        animate: true,
        animationDuration: 520,
        animationEasing: "ease-in-out-cubic",
        fit: false,
      })
      .run();
    setTimeout(() => {
      cy.animate(
        { fit: { eles: keep, padding: 60 } },
        { duration: 320, easing: "ease-in-out-cubic" },
      );
      setTimeout(() => {
        if (cy.zoom() < 0.55) {
          cy.animate(
            { zoom: { level: 0.55, position: root.position() } },
            { duration: 260, easing: "ease-out" },
          );
        }
      }, 340);
    }, 540);
  }, [focusId]);

  // ── navigator actions ─────────────────────────────────────────────────────
  const pan = (dx: number, dy: number) =>
    cyRef.current?.panBy({ x: dx, y: dy });
  const zoomBy = (factor: number) => {
    const cy = cyRef.current;
    if (!cy) return;
    const z = Math.max(MINZ, Math.min(MAXZ, cy.zoom() * factor));
    cy.animate(
      {
        zoom: { level: z, position: { x: cy.width() / 2, y: cy.height() / 2 } },
      },
      { duration: 140 },
    );
  };
  const setZoom = (p: number) => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.zoom({
      level: pctToZoom(p),
      position: { x: cy.width() / 2, y: cy.height() / 2 },
    });
  };
  const fit = () =>
    cyRef.current?.animate({ fit: { padding: 40 } }, { duration: 220 });
  const toggleFull = () => {
    const el = rootRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen?.();
    else el.requestFullscreen?.();
  };
  const reset = () => {
    setStack([]);
    setSel(null);
    setLocked(null);
    setFilters(new Set());
    pinnedRef.current = null;
    pathRef.current = null;
    spotRef.current = null;
    hoverRef.current = null;
    setTip(null);
    applyEmphasis();
    setCatalogKey((k) => k + 1); // reset the catalog drawer's navigation
    cyRef.current?.animate({ fit: { padding: 40 } }, { duration: 260 });
  };
  const back = () => setStack((s) => s.slice(0, -1));
  const toggleFilter = (t: Tier) =>
    setFilters((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });

  // ── context-menu actions ──────────────────────────────────────────────────
  const closeMenu = () => {
    setCtx(null);
    ctxRef.current = null;
  };
  const menuDetails = () => {
    if (ctx) setPanel({ type: "details", nodeId: ctx.node.id });
    closeMenu();
    applyEmphasis();
  };
  // activating a dependency chain from the context menu LOCKS the view on it
  const menuChain = (dir: ChainDir, degree: ChainDeg) => {
    if (ctx) {
      const ids = [...chainDir(ctx.node.id, dir, degree)];
      pinnedRef.current = null;
      hoverRef.current = null;
      chainSetRef.current = null;
      const dl = dir === "down" ? "downstream" : "upstream";
      const gl = degree === 0 ? "full" : `${degree}°`;
      setLocked({
        id: ctx.node.id,
        path: ids,
        label: `${ctx.node.label} · ${dl} ${gl}`,
      });
      closeMenu();
    }
  };
  // context-menu "Issue" → LOCK the graph on that issue's attack path
  const menuIssuePath = (iss: Issue) => {
    closeMenu();
    pinnedRef.current = null;
    chainSetRef.current = null;
    spotRef.current = null;
    pathRef.current = null;
    setTip(null);
    setLocked({
      id: iss.path[iss.path.length - 1] ?? iss.id,
      path: iss.path,
      label: iss.title,
    });
  };
  // lock the graph on the node's dependency chain, or on a specific issue path
  const menuLock = (path?: string[]) => {
    if (ctx) {
      setLocked({ id: ctx.node.id, path, label: ctx.node.label });
      closeMenu();
    }
  };
  const menuMark = () => {
    if (ctx) setPanel({ type: "mark", nodeId: ctx.node.id });
    closeMenu();
    applyEmphasis();
  };
  // context-menu tag → open the matching finding / issue in its catalog drawer
  const jumpToCatalog = (kind: "finding" | "issue", id: string) => {
    closeMenu();
    setSeed({ kind, id });
    setCatalogKey((k) => k + 1);
    setView(kind === "finding" ? "findings" : "issues");
  };
  const unlock = () => setLocked(null);
  const saveMark = (id: string, note: string) => {
    setMarked((prev) => ({ ...prev, [id]: { note, ts: Date.now() } }));
    setPanel(null);
  };
  const unmark = (id: string) =>
    setMarked((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  // ── saved views ────────────────────────────────────────────────────────────
  const vp = () => {
    const cy = cyRef.current;
    return cy
      ? {
          zoom: cy.zoom() as number,
          pan: { ...(cy.pan() as { x: number; y: number }) },
        }
      : { zoom: 1, pan: { x: 0, y: 0 } };
  };
  const pushView = (v: Omit<SavedView, "id" | "ts" | "view" | "stack">) => {
    setSaved((s) => [
      {
        ...v,
        id: `sv-${Date.now()}-${s.length}`,
        ts: Date.now(),
        view,
        stack: [...stack],
      },
      ...s,
    ]);
    setSavedOpen(true);
  };
  const renameSavedView = (id: string, name: string) =>
    setSaved((s) => s.map((v) => (v.id === id ? { ...v, name } : v)));
  const saveCurrentView = () => {
    setSaveMenu(false);
    // capture whatever the operator is actually looking at — priority mirrors
    // applyEmphasis: locked path → pinned chain → issue path → single node →
    // the drilled-into node's chain → full graph.
    if (locked) {
      const ids = locked.path ?? [...chainDir(locked.id, "down", 0)];
      pushView({
        ...vp(),
        name: locked.label,
        kind: "chain",
        chainIds: ids,
      });
    } else if (chainSetRef.current) {
      pushView({
        ...vp(),
        name: `Chain · ${chainSetRef.current.size} nodes`,
        kind: "chain",
        chainIds: [...chainSetRef.current],
      });
    } else if (pathRef.current) {
      pushView({
        ...vp(),
        name: "Issue path",
        kind: "issue",
        path: [...pathRef.current],
      });
    } else if (spotRef.current) {
      pushView({
        ...vp(),
        name: `Node · ${NODE_BY_ID[spotRef.current]?.label ?? spotRef.current}`,
        kind: "node",
        spot: spotRef.current,
      });
    } else if (focusId) {
      pushView({
        ...vp(),
        name: `${NODE_BY_ID[focusId]?.label ?? focusId} · expanded dependency`,
        kind: "chain",
        chainIds: [...chainDir(focusId, "down", 0)],
      });
    } else if (view === "issues") {
      pushView({
        ...vp(),
        name: `Issues catalog · ${ISSUES.length}`,
        kind: "catalog",
      });
    } else if (view === "findings") {
      pushView({
        ...vp(),
        name: `Findings catalog · ${FINDINGS.length}`,
        kind: "catalog",
      });
    } else {
      pushView({
        ...vp(),
        name: `Full view · ${saved.length + 1}`,
        kind: "full",
      });
    }
  };
  const saveChainAsView = (nodeId: string, dir: ChainDir, degree: ChainDeg) => {
    const ids = [...chainDir(nodeId, dir, degree)];
    const dl = dir === "down" ? "downstream" : "upstream";
    const gl = degree === 0 ? "full" : `${degree}°`;
    pushView({
      ...vp(),
      name: `${NODE_BY_ID[nodeId]?.label ?? nodeId} · ${dl} ${gl}`,
      kind: "chain",
      chainIds: ids,
    });
  };
  const saveIssueAsView = (iss: Issue) => {
    pushView({
      ...vp(),
      name: `Issue ${iss.id}`,
      kind: "issue",
      path: [...iss.path],
    });
  };
  const applySavedView = (v: SavedView) => {
    setSavedOpen(false);
    setView(v.view); // restore the mode (graph / findings / issues catalog)
    setLocked(null);
    setSel(null);
    setTip(null);
    hoverRef.current = null;
    pinnedRef.current = null;
    chainSetRef.current = v.chainIds ? new Set(v.chainIds) : null;
    pathRef.current = v.path ?? null;
    spotRef.current = v.spot ?? null;
    // re-enter the expanded-dependency drill (navigates back into that view);
    // the drill effect re-lays-out + fits, so skip the manual pan/zoom there.
    setStack(v.stack);
    const cy = cyRef.current;
    if (cy && v.stack.length === 0) {
      cy.animate({ zoom: v.zoom, pan: v.pan }, { duration: 320 });
    }
    applyEmphasis();
  };
  const deleteSavedView = (id: string) =>
    setSaved((s) => s.filter((v) => v.id !== id));

  const selectMarked = (id: string) => {
    // activate just this marked node's view; others shadowed (graph stays put)
    chainSetRef.current = null;
    pinnedRef.current = id;
    emphasize(id);
    setSel(NODE_BY_ID[id]);
  };
  // single-resource spotlight: dashed box + tooltip on exactly one node.
  // Used by a finding (single resource) and by a node opened inside an issue.
  // useCallback-stable so the drawer's sync effect doesn't loop.
  const focusNode = React.useCallback(
    (id: string | null) => {
      pinnedRef.current = null;
      chainSetRef.current = null;
      pathRef.current = null;
      spotRef.current = id;
      setTip(id ? { id } : null);
      applyEmphasis();
      if (id) setSel(NODE_BY_ID[id] ?? null);
    },
    [applyEmphasis],
  );
  // issue: spotlight the whole attack path (the chain of resources)
  const focusIssuePath = React.useCallback(
    (iss: Issue | null) => {
      pinnedRef.current = null;
      chainSetRef.current = null;
      spotRef.current = null;
      setTip(null);
      pathRef.current = iss ? iss.path : null;
      applyEmphasis();
    },
    [applyEmphasis],
  );
  // a node opened from inside an issue: keep the whole path lit + box the node
  const focusNodeInPath = React.useCallback(
    (id: string, path: string[]) => {
      pinnedRef.current = null;
      pathRef.current = path;
      spotRef.current = id;
      setTip({ id });
      applyEmphasis();
      setSel(NODE_BY_ID[id] ?? null);
    },
    [applyEmphasis],
  );
  // "Expand dependency chain" (node drawer) — light the node's full chain
  const expandChain = React.useCallback(
    (id: string) => {
      spotRef.current = null;
      pathRef.current = null;
      setTip(null);
      pinnedRef.current = id;
      applyEmphasis();
    },
    [applyEmphasis],
  );

  // chrome (toolbar/filter/toggle) is always white — independent of app theme
  const C = {
    border: CHROME.border,
    text: CHROME.text,
    muted: CHROME.muted,
    card: CHROME.bg,
  };

  return (
    <div
      ref={rootRef}
      className="cg-impact-root"
      style={{
        position: "relative",
        height: isFull ? "100vh" : "calc(100vh - 230px)",
        minHeight: 540,
        border: `1px solid ${C.border}`,
        background: BG,
        overflow: "hidden",
        // own stacking context so the drawer/menu z-indexes never fight the
        // global top bar (search / notifications / profile dropdowns)
        isolation: "isolate",
      }}
    >
      <style>
        {
          "@keyframes cgImpactFsIn{from{opacity:.35;transform:scale(.985)}to{opacity:1;transform:none}}.cg-impact-root:fullscreen{background:#fff;animation:cgImpactFsIn .42s cubic-bezier(.2,.7,.3,1)}"
        }
      </style>
      {/* graph area — shrinks to make room for the right drawer */}
      <div
        onContextMenu={(e) => e.preventDefault()}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          bottom: 0,
          right: rightOpen ? ALERTS_W : 0,
          transition: "right .25s ease",
          cursor: picking ? "crosshair" : undefined,
        }}
      >
        <GraphWatermark />
        <div
          ref={ref}
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 1,
            cursor: picking ? "crosshair" : undefined,
          }}
        />

        {/* context-menu spotlight backdrop — click to dismiss */}
        {ctx && (
          <div
            onClick={() => {
              closeMenu();
              applyEmphasis();
            }}
            aria-hidden="true"
            style={{ position: "absolute", inset: 0, zIndex: 14 }}
          />
        )}

        {/* node context menu */}
        {ctx && (
          <NodeContextMenu
            ctx={ctx}
            flipUp={ctx.y > (ref.current?.clientHeight ?? 700) - 320}
            marked={!!marked[ctx.node.id]}
            finding={FINDING_BY_NODE[ctx.node.id]}
            issues={issuesForNode(ctx.node.id)}
            onDetails={menuDetails}
            onChain={menuChain}
            onSaveChain={(dir, deg) => {
              saveChainAsView(ctx.node.id, dir, deg);
              closeMenu();
            }}
            onIssuePath={menuIssuePath}
            onSaveIssue={(iss) => {
              saveIssueAsView(iss);
              closeMenu();
            }}
            onLock={menuLock}
            onMark={menuMark}
            onJump={jumpToCatalog}
          />
        )}

        {/* locked-view banner — Escape to exit */}
        {locked && (
          <div
            style={{
              position: "absolute",
              top: 54,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 13,
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              padding: "7px 10px 7px 14px",
              borderRadius: 8,
              background: "rgb(23,23,22)",
              color: "#fff",
              fontSize: 12.5,
              boxShadow: "0 3px 12px rgba(0,0,0,0.3)",
            }}
          >
            <Lock size={13} />
            Locked · {locked.label}
            {locked.path ? " · issue path" : " · dependency"}
            <button
              type="button"
              onClick={unlock}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                height: 24,
                padding: "0 9px",
                borderRadius: 6,
                border: "1px solid rgba(255,255,255,0.25)",
                background: "transparent",
                color: "#fff",
                fontSize: 11.5,
                cursor: "pointer",
              }}
            >
              <X size={12} /> Esc
            </button>
          </div>
        )}

        {/* top-left toolbar: back · reset · fit */}
        <div
          style={{
            position: "absolute",
            top: 12,
            left: 12,
            display: "flex",
            gap: 8,
            zIndex: 10,
          }}
        >
          {stack.length > 0 && (
            <button type="button" onClick={back} style={graphToolBtn(false)}>
              <ArrowLeft size={13} /> Back
            </button>
          )}
          <button type="button" onClick={reset} style={graphToolBtn(false)}>
            <RotateCcw size={13} /> Reset
          </button>
          <button type="button" onClick={fit} style={graphToolBtn(false)}>
            <Maximize2 size={13} /> Fit
          </button>
          <button
            type="button"
            onClick={toggleFull}
            style={graphToolBtn(false)}
            title={isFull ? "Exit full screen" : "Full screen"}
          >
            {isFull ? <Minimize size={13} /> : <Expand size={13} />}
            {isFull ? "Exit" : "Full screen"}
          </button>

          {/* Save ▾ — recallable saved views */}
          <div style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => setSaveMenu((o) => !o)}
              style={graphToolBtn(saveMenu)}
              title="Save this view"
            >
              <Save size={13} /> Save
              <ChevronDown size={12} style={{ marginLeft: 1 }} />
            </button>
            {saveMenu && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 4px)",
                  left: 0,
                  width: 210,
                  background: CHROME.bg,
                  border: `1px solid ${CHROME.border}`,
                  borderRadius: 9,
                  padding: 5,
                  boxShadow: "0 10px 26px rgba(0,0,0,0.18)",
                  zIndex: 20,
                }}
              >
                <button
                  type="button"
                  onClick={saveCurrentView}
                  style={saveMenuItem}
                >
                  <Save size={13} /> Save full view
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSaveMenu(false);
                    setPicking(true);
                    setSavedOpen(false);
                  }}
                  style={saveMenuItem}
                >
                  <Crosshair size={13} /> Pick a view to save…
                </button>
                <div
                  style={{
                    height: 1,
                    background: CHROME.border,
                    margin: "4px 2px",
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    setSaveMenu(false);
                    setSavedOpen(true);
                  }}
                  style={saveMenuItem}
                >
                  <Frame size={13} /> Saved views · {saved.length}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* hover read-out — terminal-style, top-left under the toolbar */}
        {hoverInfo && <HoverReadout node={hoverInfo} />}

        {/* picker-mode banner */}
        {picking && (
          <div
            style={{
              position: "absolute",
              top: 54,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 18,
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              padding: "7px 10px 7px 14px",
              borderRadius: 8,
              background: CHROME.accent,
              color: "#fff",
              fontSize: 12.5,
              boxShadow: "0 3px 12px rgba(0,0,0,0.25)",
            }}
          >
            <Crosshair size={13} /> Click a node — pick a chain or issue to save
            <button
              type="button"
              onClick={() => setPicking(false)}
              style={{
                background: "rgba(255,255,255,0.22)",
                border: "none",
                color: "#fff",
                borderRadius: 6,
                padding: "3px 8px",
                cursor: "pointer",
                fontSize: 11.5,
              }}
            >
              Cancel
            </button>
          </div>
        )}

        {/* saved-views drawer — right panel; names editable, with a data ref */}
        {savedOpen && (
          <div style={drawerShell}>
            <div style={drawerHead}>
              <Frame size={15} /> Saved views · {saved.length}
              <button
                type="button"
                aria-label="Close"
                onClick={() => setSavedOpen(false)}
                style={{
                  marginLeft: "auto",
                  background: "transparent",
                  border: "none",
                  color: "var(--cg-text-muted)",
                  cursor: "pointer",
                  display: "inline-flex",
                }}
              >
                <X size={17} />
              </button>
            </div>
            <div style={{ overflowY: "auto", flex: 1 }}>
              {saved.length === 0 ? (
                <div
                  style={{
                    padding: "16px",
                    fontSize: 12.5,
                    color: "var(--cg-text-muted)",
                    fontStyle: "italic",
                  }}
                >
                  No saved views yet. Use Save ▾ (Save full view / Pick a view
                  to save) or the node context menu.
                </div>
              ) : (
                saved.map((v) => (
                  <div
                    key={v.id}
                    style={{
                      padding: "12px 14px",
                      borderBottom: "1px solid var(--cg-border-subtle)",
                    }}
                  >
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <input
                        value={v.name}
                        onChange={(e) => renameSavedView(v.id, e.target.value)}
                        aria-label="View name"
                        style={{
                          flex: 1,
                          minWidth: 0,
                          fontSize: 13,
                          fontWeight: 600,
                          color: "var(--cg-text-primary)",
                          background: "transparent",
                          border: "1px solid transparent",
                          borderRadius: 6,
                          padding: "4px 6px",
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor =
                            "var(--cg-border)";
                          e.currentTarget.style.background =
                            "var(--cg-bg-card)";
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = "transparent";
                          e.currentTarget.style.background = "transparent";
                        }}
                      />
                      <button
                        type="button"
                        aria-label="Delete"
                        onClick={() => deleteSavedView(v.id)}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "var(--cg-text-muted)",
                          cursor: "pointer",
                          display: "inline-flex",
                          flexShrink: 0,
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    {/* data reference */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        margin: "6px 6px 0",
                        fontSize: 11.5,
                        color: "var(--cg-text-muted)",
                      }}
                    >
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                        }}
                      >
                        <GitBranch size={11} /> {savedViewRef(v)}
                      </span>
                      <span>·</span>
                      <span>
                        {new Date(v.ts).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => applySavedView(v)}
                      style={{
                        ...graphToolBtn(false),
                        marginTop: 10,
                        width: "100%",
                        justifyContent: "center",
                      }}
                    >
                      <Crosshair size={13} /> Open view
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* filter bar — compact for responsiveness */}
        <div
          style={{
            position: "absolute",
            top: 12,
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            gap: 3,
            zIndex: 10,
            maxWidth: "42%",
            overflow: "hidden",
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 9,
            padding: 3,
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          }}
        >
          {TIER_ORDER.map((t) => {
            const on = filters.has(t);
            return (
              <button
                key={t}
                type="button"
                onClick={() => toggleFilter(t)}
                style={{
                  height: 24,
                  padding: "0 8px",
                  borderRadius: 6,
                  border: `1px solid ${on ? TIER_COLOUR[t] : "transparent"}`,
                  background: on ? `${TIER_COLOUR[t]}1f` : "transparent",
                  color: on ? C.text : C.muted,
                  fontSize: 11.5,
                  fontWeight: on ? 600 : 500,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  whiteSpace: "nowrap",
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    background: TIER_COLOUR[t],
                    flexShrink: 0,
                  }}
                />
                {TIER_LABEL[t]}
              </button>
            );
          })}
        </div>

        {/* mode toggle: Security graph · Findings · Issues */}
        <div
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            display: "flex",
            zIndex: 10,
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            padding: 3,
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          }}
        >
          {(
            [
              { id: "graph", label: "Security Graph", icon: null, n: 0 },
              {
                id: "findings",
                label: "Findings",
                icon: <AlertTriangle size={12} />,
                n: FINDINGS.length,
              },
              {
                id: "issues",
                label: "Issues",
                icon: <GitBranch size={12} />,
                n: ISSUES.length,
              },
            ] as const
          ).map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                setView(m.id);
                if (m.id === "graph") reset();
              }}
              style={{
                height: 28,
                padding: "0 12px",
                borderRadius: 6,
                border: "none",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: view === m.id ? 700 : 500,
                background: view === m.id ? CHROME.accentBg : "transparent",
                color: view === m.id ? CHROME.accent : C.muted,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {m.icon}
              {m.label}
              {m.n > 0 && (
                <span
                  style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    padding: "0 5px",
                    borderRadius: 8,
                    background: view === m.id ? CHROME.accent : CHROME.hover,
                    color: view === m.id ? "#fff" : C.muted,
                  }}
                >
                  {m.n}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* navigator controller */}
        <GraphNavigator
          onPan={pan}
          onZoomIn={() => zoomBy(1.3)}
          onZoomOut={() => zoomBy(1 / 1.3)}
          onFit={fit}
          zoomPct={zoomPct}
          onZoomPct={setZoom}
          showMini={showMini}
          onToggleMini={() => setShowMini((s) => !s)}
          markedCount={Object.keys(marked).length}
          onOpenMarked={() => setPanel({ type: "marklist" })}
        />

        {/* frame viewer (minimap) */}
        {showMini && frame && frame.bb.w > 0 && (
          <GraphMinimap
            frame={frame}
            dots={dots}
            onJump={(gx, gy) => {
              const cy = cyRef.current;
              if (!cy) return;
              // centre the clicked graph point in the viewport (keep zoom)
              cy.animate(
                {
                  pan: {
                    x: cy.width() / 2 - gx * cy.zoom(),
                    y: cy.height() / 2 - gy * cy.zoom(),
                  },
                },
                { duration: 180 },
              );
            }}
          />
        )}

        {/* graph tooltip — glued above the spotlit node */}
        {tip && tipPos && NODE_BY_ID[tip.id] && (
          <div
            style={{
              position: "absolute",
              left: tipPos.x,
              top: tipPos.y - 10,
              transform: "translate(-50%, -100%)",
              zIndex: 15,
              pointerEvents: "none",
              background: "rgb(23,23,22)",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.14)",
              borderRadius: 7,
              padding: "6px 9px",
              fontSize: 11.5,
              whiteSpace: "nowrap",
              boxShadow: "0 4px 14px rgba(0,0,0,0.35)",
            }}
          >
            <span
              style={{
                display: "inline-block",
                width: 8,
                height: 8,
                borderRadius: 2,
                background: TIER_COLOUR[NODE_BY_ID[tip.id].tier],
                marginRight: 6,
              }}
            />
            <b>{NODE_BY_ID[tip.id].label}</b>
            <span style={{ color: "#9aa3ad" }}>
              {" "}
              · {TIER_LABEL[NODE_BY_ID[tip.id].tier]}
            </span>
            {FINDING_BY_NODE[tip.id] && (
              <span
                style={{ color: SEV_COLOUR[FINDING_BY_NODE[tip.id].severity] }}
              >
                {" "}
                · {FINDING_BY_NODE[tip.id].severity}
              </span>
            )}
          </div>
        )}
      </div>

      {/* auxiliary drawer — mark · marked list (from the graph context menu) */}
      {panel && (
        <AuxDrawer
          panel={panel}
          marked={marked}
          onClose={() => {
            setPanel(null);
            applyEmphasis();
          }}
          onSaveMark={saveMark}
          onUnmark={unmark}
          onSelectMarked={selectMarked}
          onExpandChain={expandChain}
        />
      )}

      {/* findings / issues catalog drawer — navigable (list → detail → node) */}
      {(view === "findings" || view === "issues") && !panel && (
        <CatalogDrawer
          key={catalogKey}
          mode={view}
          marked={marked}
          seed={seed}
          onClose={() => setView("graph")}
          onFocusNode={focusNode}
          onFocusNodeInPath={focusNodeInPath}
          onFocusIssue={focusIssuePath}
          onExpandChain={expandChain}
          onMark={(nodeId) => setPanel({ type: "mark", nodeId })}
        />
      )}
    </div>
  );
}

// ── shared schema renderers (grey when a field is absent) ─────────────────────
function SevChip({ sev }: { sev: Severity }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "1px 8px",
        borderRadius: 6,
        fontSize: 11,
        fontWeight: 700,
        color: SEV_COLOUR[sev],
        background: `${SEV_COLOUR[sev]}22`,
        border: `1px solid ${SEV_COLOUR[sev]}66`,
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: SEV_COLOUR[sev],
        }}
      />
      {sev}
    </span>
  );
}
function Field({
  k,
  v,
}: {
  k: string;
  v: React.ReactNode | string | number | boolean | undefined | null;
}) {
  const absent =
    v === undefined || v === null || v === "" || v === "—" || v === false;
  let display: React.ReactNode = "—";
  if (!absent) display = v === true ? "Yes" : (v as React.ReactNode);
  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        padding: "6px 0",
        fontSize: 12.5,
        borderBottom: "1px solid var(--cg-border-subtle)",
      }}
    >
      <span
        style={{ color: "var(--cg-text-muted)", minWidth: 132, flexShrink: 0 }}
      >
        {k}
      </span>
      <span
        style={{
          color: absent ? "var(--cg-text-muted)" : "var(--cg-text-primary)",
          fontStyle: absent ? "italic" : "normal",
          wordBreak: "break-word",
        }}
      >
        {display}
      </span>
    </div>
  );
}
function GroupHead({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        color: "var(--cg-text-muted)",
        margin: "16px 0 6px",
      }}
    >
      {children}
    </div>
  );
}

// full finding schema — reused by node details + findings catalog accordion
function IssueSchema({ iss }: { iss: Issue }) {
  return (
    <div>
      <GroupHead>Attack path type</GroupHead>
      <Field k="Type" v={iss.attackType} />
      <Field k="Path risk score" v={<SevChip sev={iss.risk} />} />
      <GroupHead>Entry point (start node)</GroupHead>
      <Field k="Entry point" v={iss.entryPoint} />
      <GroupHead>Target (end node)</GroupHead>
      <Field k="Target" v={iss.target} />
      <GroupHead>Path properties</GroupHead>
      <Field k="Hop count" v={iss.hopCount} />
      <Field k="Crosses account boundary" v={iss.crossesAccount} />
      <Field k="Crosses VPC boundary" v={iss.crossesVpc} />
      <Field k="Involves public resource" v={iss.involvesPublic} />
      <Field k="Exploitability" v={iss.exploitability} />
      <Field k="Chained findings" v={iss.findingIds.length} />
      <GroupHead>Findings on the path</GroupHead>
      <Field k="Min severity on path" v={<SevChip sev={iss.minSeverity} />} />
      <Field
        k="Finding types"
        v={iss.findingTypes.length ? iss.findingTypes.join(", ") : undefined}
      />
      <Field k="Has active exploit" v={iss.hasActiveExploit} />
      <GroupHead>Status</GroupHead>
      <Field k="Status" v={iss.status} />
    </div>
  );
}

// issue "Policy" sub-view — governing controls on the path + a guardrail to break it
function IssuePolicy({ iss }: { iss: Issue }) {
  const findings = iss.findingIds
    .map((id) => FINDINGS.find((f) => f.id === id))
    .filter(Boolean) as Finding[];
  const frameworks = Array.from(new Set(findings.map((f) => f.framework)));
  const controls = Array.from(new Set(findings.map((f) => f.controlId)));
  const target = NODE_BY_ID[iss.path[iss.path.length - 1]];
  const guardrail = JSON.stringify(
    {
      Version: "2012-10-17",
      Statement: [
        {
          Sid: "BreakAttackPath",
          Effect: "Deny",
          Principal: iss.involvesPublic ? "*" : { AWS: "arn:aws:iam::*:root" },
          Action: iss.involvesPublic ? ["s3:GetObject", "s3:PutObject"] : ["*"],
          Resource: `arn:aws:*:*:*:${target?.label ?? "*"}`,
          Condition: { Bool: { "aws:SecureTransport": "false" } },
        },
      ],
    },
    null,
    2,
  );
  return (
    <div>
      <GroupHead>Governing controls</GroupHead>
      <Field
        k="Frameworks"
        v={frameworks.length ? frameworks.join(", ") : undefined}
      />
      <Field
        k="Control IDs"
        v={controls.length ? controls.join(", ") : undefined}
      />
      <Field k="Findings on path" v={findings.length} />
      <Field k="Min severity" v={<SevChip sev={iss.minSeverity} />} />
      <GroupHead>Suggested guardrail policy</GroupHead>
      <div
        style={{
          fontSize: 11.5,
          color: "var(--cg-text-muted)",
          margin: "0 0 6px",
          lineHeight: 1.45,
        }}
      >
        A deny policy that breaks this attack path at the target.
      </div>
      <pre
        style={{
          margin: 0,
          padding: 12,
          borderRadius: 8,
          background: "var(--cg-code-bg, #1a1a19)",
          color: "#dfe6e9",
          fontSize: 11.5,
          lineHeight: 1.5,
          overflowX: "auto",
          fontFamily:
            "'IBM Plex Mono', source-code-pro, Menlo, Consolas, monospace",
        }}
      >
        {guardrail}
      </pre>
    </div>
  );
}

// ── hover read-out — terminal-style key:value lines ──────────────────────────
function HoverReadout({ node }: { node: IANode }) {
  const rows: [string, string][] = [
    [node.tier === "resource" ? "resource" : node.tier, node.label],
    ["category", TIER_LABEL[node.tier]],
    ["blast radius", `${REACH[node.id] ?? 0} downstream`],
  ];
  if (node.alert) rows.push(["status", node.alert.toUpperCase()]);
  return (
    <div
      style={{
        position: "absolute",
        top: 54,
        left: 12,
        zIndex: 10,
        minWidth: 230,
        maxWidth: 320,
        background: "rgb(23,23,22)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 8,
        padding: "10px 12px",
        boxShadow: "0 6px 20px rgba(0,0,0,0.3)",
        fontFamily:
          "'IBM Plex Mono', source-code-pro, Menlo, Consolas, monospace",
        fontSize: 12,
        lineHeight: 1.65,
        pointerEvents: "none",
      }}
    >
      {rows.map(([k, v]) => (
        <div key={k} style={{ display: "flex", gap: 6, whiteSpace: "nowrap" }}>
          <span
            style={{
              color: "#7f8a84",
              minWidth: 92,
              display: "inline-block",
            }}
          >
            {k}
          </span>
          <span style={{ color: "#8a96a8" }}>:</span>
          <span
            style={{
              color: node.alert === "error" ? "#ff8c82" : "#e8e8e2",
              fontWeight: 600,
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {v}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── right-click node context menu ─────────────────────────────────────────────
const ctxItem = (disabled = false): React.CSSProperties => ({
  display: "flex",
  alignItems: "center",
  gap: 9,
  width: "100%",
  padding: "8px 10px",
  border: "none",
  borderRadius: 6,
  background: "transparent",
  color: disabled ? "#6b7178" : "#dfe2e6",
  fontSize: 12.5,
  cursor: disabled ? "default" : "pointer",
  textAlign: "left",
});
const submenuBox: React.CSSProperties = {
  position: "absolute",
  left: "100%",
  top: -6,
  marginLeft: 4,
  width: 200,
  background: "rgb(23,23,22)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 10,
  padding: 6,
  boxShadow: "0 10px 28px rgba(0,0,0,0.4)",
};
const ctxGroupHead: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "5px 10px 3px",
  fontSize: 10,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: 0.4,
  color: "#8a96a8",
};
const saveMenuItem: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  width: "100%",
  padding: "8px 9px",
  border: "none",
  borderRadius: 6,
  background: "transparent",
  color: CHROME.text,
  fontSize: 12.5,
  cursor: "pointer",
  textAlign: "left",
};

function NodeContextMenu({
  ctx,
  flipUp,
  marked,
  finding,
  issues,
  onDetails,
  onChain,
  onSaveChain,
  onIssuePath,
  onSaveIssue,
  onLock,
  onMark,
  onJump,
}: {
  ctx: { x: number; y: number; node: IANode };
  flipUp: boolean;
  marked: boolean;
  finding?: Finding;
  issues: Issue[];
  onDetails: () => void;
  onChain: (dir: ChainDir, degree: ChainDeg) => void;
  onSaveChain: (dir: ChainDir, degree: ChainDeg) => void;
  onIssuePath: (iss: Issue) => void;
  onSaveIssue: (iss: Issue) => void;
  onLock: (path?: string[]) => void;
  onMark: () => void;
  onJump: (kind: "finding" | "issue", id: string) => void;
}) {
  // one hover-submenu open at a time, with a close delay
  const [sub, setSub] = React.useState<"issue" | "lock" | "chain" | null>(null);
  const [copied, setCopied] = React.useState(false);
  const subTimer = React.useRef<number | undefined>(undefined);
  const copyId = () => {
    navigator.clipboard?.writeText(ctx.node.id);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };
  const openSub = (which: "issue" | "lock" | "chain") => () => {
    window.clearTimeout(subTimer.current);
    setSub(which);
  };
  const closeSub = () => {
    subTimer.current = window.setTimeout(() => setSub(null), 160);
  };
  const hoverBg = (on: boolean) => (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.background = on
      ? "rgba(255,255,255,0.08)"
      : "transparent";
  };
  // a flyout submenu that opens upward when the menu is near the bottom edge
  const subStyle: React.CSSProperties = flipUp
    ? { ...submenuBox, top: "auto", bottom: -6 }
    : submenuBox;
  return (
    <div
      style={{
        position: "absolute",
        left: ctx.x + 6,
        top: ctx.y + 6,
        transform: flipUp ? "translateY(-100%)" : undefined,
        zIndex: 16,
        width: 210,
        background: "rgb(23,23,22)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 10,
        padding: 6,
        boxShadow: "0 10px 28px rgba(0,0,0,0.4)",
      }}
    >
      <div
        style={{
          padding: "6px 10px 8px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "#fff",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {ctx.node.label}
        </div>
        <button
          type="button"
          onClick={copyId}
          title="Copy node ID"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            marginTop: 3,
            padding: 0,
            border: "none",
            background: "transparent",
            color: "#8a96a8",
            fontSize: 10.5,
            fontFamily:
              "'IBM Plex Mono', source-code-pro, Menlo, Consolas, monospace",
            cursor: "pointer",
            maxWidth: "100%",
          }}
        >
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {ctx.node.id}
          </span>
          {copied ? (
            <Check size={11} color="#39b84e" style={{ flexShrink: 0 }} />
          ) : (
            <Copy size={11} style={{ flexShrink: 0 }} />
          )}
        </button>
      </div>

      {/* finding / attack-path tags (clickable → open in the catalog) */}
      {(finding || issues.length > 0) && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 5,
            padding: "8px 10px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {finding && (
            <button
              type="button"
              onClick={() => onJump("finding", finding.id)}
              title={finding.category}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                height: 22,
                padding: "0 8px",
                borderRadius: 11,
                border: `1px solid ${SEV_COLOUR[finding.severity]}66`,
                background: `${SEV_COLOUR[finding.severity]}22`,
                color: SEV_COLOUR[finding.severity],
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <AlertTriangle size={10} /> Finding
            </button>
          )}
          {issues.map((iss) => (
            <button
              key={iss.id}
              type="button"
              onClick={() => onJump("issue", iss.id)}
              title={iss.title}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                height: 22,
                padding: "0 8px",
                borderRadius: 11,
                border: "1px solid rgba(91,155,240,0.5)",
                background: "rgba(91,155,240,0.16)",
                color: "#90bdf5",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <GitBranch size={10} /> {iss.id}
            </button>
          ))}
        </div>
      )}

      <div style={{ paddingTop: 4 }}>
        <button
          type="button"
          onClick={onDetails}
          style={ctxItem()}
          onMouseEnter={hoverBg(true)}
          onMouseLeave={hoverBg(false)}
        >
          <Info size={14} /> View node details
        </button>
        {/* Dependency chain — bifurcates into Upstream / Downstream × degree */}
        <div
          style={{ position: "relative" }}
          onMouseEnter={openSub("chain")}
          onMouseLeave={closeSub}
        >
          <button
            type="button"
            onClick={() => onChain("down", 0)}
            style={ctxItem()}
            onMouseEnter={hoverBg(true)}
            onMouseLeave={hoverBg(false)}
          >
            <GitBranch size={14} /> Dependency chain
            <ChevronRight
              size={13}
              color="#7f8a84"
              style={{ marginLeft: "auto" }}
            />
          </button>
          {sub === "chain" && (
            <div
              onMouseEnter={openSub("chain")}
              onMouseLeave={closeSub}
              style={subStyle}
            >
              <div style={ctxGroupHead}>
                <ArrowDown size={11} /> Downstream · data flows out
              </div>
              {(
                [
                  [1, "Direct (1st degree)"],
                  [2, "2nd degree"],
                  [0, "Full chain"],
                ] as [ChainDeg, string][]
              ).map(([deg, label]) => (
                <button
                  key={`d${deg}`}
                  type="button"
                  onClick={() => onChain("down", deg)}
                  style={ctxItem()}
                  onMouseEnter={hoverBg(true)}
                  onMouseLeave={hoverBg(false)}
                >
                  {label}
                </button>
              ))}
              <div style={{ ...ctxGroupHead, marginTop: 4 }}>
                <ArrowUp size={11} /> Upstream · data flows in
              </div>
              {(
                [
                  [1, "Direct (1st degree)"],
                  [2, "2nd degree"],
                  [0, "Full chain"],
                ] as [ChainDeg, string][]
              ).map(([deg, label]) => (
                <button
                  key={`u${deg}`}
                  type="button"
                  onClick={() => onChain("up", deg)}
                  style={ctxItem()}
                  onMouseEnter={hoverBg(true)}
                  onMouseLeave={hoverBg(false)}
                >
                  {label}
                </button>
              ))}
              <div
                style={{
                  height: 1,
                  background: "rgba(255,255,255,0.1)",
                  margin: "4px 2px",
                }}
              />
              <button
                type="button"
                onClick={() => onSaveChain("down", 0)}
                style={ctxItem()}
                onMouseEnter={hoverBg(true)}
                onMouseLeave={hoverBg(false)}
              >
                <Save size={13} /> Save this chain
              </button>
            </div>
          )}
        </div>

        {/* Issue — adjacent list of the attack paths the node is on */}
        {issues.length > 0 && (
          <div
            style={{ position: "relative" }}
            onMouseEnter={openSub("issue")}
            onMouseLeave={closeSub}
          >
            <button
              type="button"
              onClick={() => onIssuePath(issues[0])}
              style={ctxItem()}
              onMouseEnter={hoverBg(true)}
              onMouseLeave={hoverBg(false)}
            >
              <GitBranch size={14} color="#90bdf5" /> Issue
              <ChevronRight
                size={13}
                color="#7f8a84"
                style={{ marginLeft: "auto" }}
              />
            </button>
            {sub === "issue" && (
              <div
                onMouseEnter={openSub("issue")}
                onMouseLeave={closeSub}
                style={subStyle}
              >
                {issues.map((iss) => (
                  <div
                    key={iss.id}
                    style={{ display: "flex", alignItems: "center" }}
                  >
                    <button
                      type="button"
                      onClick={() => onIssuePath(iss)}
                      title={iss.title}
                      style={{ ...ctxItem(), flex: 1, minWidth: 0 }}
                      onMouseEnter={hoverBg(true)}
                      onMouseLeave={hoverBg(false)}
                    >
                      <GitBranch size={13} color="#90bdf5" />
                      <span
                        style={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {iss.id} · {iss.attackType}
                      </span>
                    </button>
                    <button
                      type="button"
                      title="Save this issue chain"
                      onClick={() => onSaveIssue(iss)}
                      style={{
                        ...ctxItem(),
                        width: "auto",
                        padding: "8px 8px",
                        flexShrink: 0,
                      }}
                      onMouseEnter={hoverBg(true)}
                      onMouseLeave={hoverBg(false)}
                    >
                      <Save size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Lock the view — adjacent submenu when the node is in an issue */}
        <div
          style={{ position: "relative" }}
          onMouseEnter={openSub("lock")}
          onMouseLeave={closeSub}
        >
          <button
            type="button"
            onClick={() => onLock()}
            style={ctxItem()}
            onMouseEnter={hoverBg(true)}
            onMouseLeave={hoverBg(false)}
          >
            <Lock size={14} /> Lock the view
            {issues.length > 0 && (
              <ChevronRight
                size={13}
                color="#7f8a84"
                style={{ marginLeft: "auto" }}
              />
            )}
          </button>
          {sub === "lock" && issues.length > 0 && (
            <div
              onMouseEnter={openSub("lock")}
              onMouseLeave={closeSub}
              style={subStyle}
            >
              <button
                type="button"
                onClick={() => onLock()}
                style={ctxItem()}
                onMouseEnter={hoverBg(true)}
                onMouseLeave={hoverBg(false)}
              >
                <GitBranch size={13} /> Dependency chain
              </button>
              {issues.map((iss) => (
                <button
                  key={iss.id}
                  type="button"
                  onClick={() => onLock(iss.path)}
                  style={ctxItem()}
                  onMouseEnter={hoverBg(true)}
                  onMouseLeave={hoverBg(false)}
                >
                  <Lock size={13} /> Issue {iss.id}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* not wired yet */}
        <button type="button" disabled style={ctxItem(true)}>
          <Bot size={14} /> Ask agent
        </button>
        <button type="button" disabled style={ctxItem(true)}>
          <Play size={14} /> Run simulation
        </button>

        <button
          type="button"
          onClick={onMark}
          style={ctxItem()}
          onMouseEnter={hoverBg(true)}
          onMouseLeave={hoverBg(false)}
        >
          <Star
            size={14}
            color={marked ? "#f5b301" : undefined}
            fill={marked ? "#f5b301" : "none"}
          />
          {marked ? "Edit mark / note" : "Mark node"}
        </button>
      </div>
    </div>
  );
}

// ── auxiliary right drawer (details · mark · marked list) ─────────────────────
// Always a WHITE panel independent of app theme — pin the CloudGuard CSS vars to
// their light values on the drawer root so all descendants render dark-on-white.
const drawerShell = {
  position: "absolute",
  top: 0,
  right: 0,
  height: "100%",
  width: ALERTS_W,
  display: "flex",
  flexDirection: "column",
  zIndex: 41,
  boxShadow: "-6px 0 18px rgba(0,0,0,0.12)",
  colorScheme: "light",
  background: "#ffffff",
  color: "hsl(0deg,0%,7%)",
  borderLeft: "1px solid rgba(30,20,10,0.12)",
  "--cg-bg-card": "#ffffff",
  "--cg-bg-hover": "hsl(50deg,20.7%,91%)",
  "--cg-text-primary": "hsl(0deg,0%,7%)",
  "--cg-text-muted": "hsl(51deg,3.1%,43.7%)",
  "--cg-text-nav": "hsl(60deg,2.5%,23.3%)",
  "--cg-border": "rgba(30,20,10,0.12)",
  "--cg-border-card": "rgba(30,20,10,0.2)",
  "--cg-border-subtle": "rgba(30,20,10,0.07)",
  "--cg-accent": "hsl(210deg,70.9%,51.6%)",
  "--cg-accent-bg": "rgba(45,134,212,0.08)",
  "--cg-code-bg": "#1a1a19",
} as React.CSSProperties;
const drawerHead: React.CSSProperties = {
  padding: "16px 16px 14px",
  borderBottom: "1px solid var(--cg-border)",
  fontSize: 14.5,
  fontWeight: 600,
  color: "var(--cg-text-primary)",
  display: "flex",
  alignItems: "center",
  gap: 8,
};
const drawerSec: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.05em",
  textTransform: "uppercase",
  color: "var(--cg-text-muted)",
  margin: "18px 0 8px",
};
// scrollable sub-view tab strip (Node detail · Finding · Policy · … )
const drawerTabStrip: React.CSSProperties = {
  display: "flex",
  gap: 2,
  padding: "10px 10px 0",
  borderBottom: "1px solid var(--cg-border)",
  overflowX: "auto",
  flexWrap: "nowrap",
};
function drawerTab(active: boolean): React.CSSProperties {
  return {
    padding: "6px 9px 9px",
    border: "none",
    background: "transparent",
    color: active ? "var(--cg-text-primary)" : "var(--cg-text-muted)",
    fontSize: 12,
    fontWeight: active ? 700 : 500,
    cursor: "pointer",
    whiteSpace: "nowrap",
    flexShrink: 0,
    borderBottom: active
      ? "2px solid var(--cg-accent)"
      : "2px solid transparent",
    marginBottom: -1,
  };
}

// scrollable node-detail content — reused by the context-menu drawer and the
// findings/issues catalog navigation (single resource = single finding).
function NodeDetailBody({
  nodeId,
  marked,
  onExpandChain,
}: {
  nodeId: string;
  marked: Record<string, { note: string; ts: number }>;
  onExpandChain?: (id: string) => void;
}) {
  const [tab, setTab] = React.useState<
    "node" | "finding" | "policy" | "remediation" | "logs" | "notes"
  >("node");
  const node = NODE_BY_ID[nodeId];
  const noteApi = useNotes(nodeId);
  if (!node) return null;
  const rel = relationsOf(node.id);
  const f = FINDING_BY_NODE[node.id];
  const TABS: [typeof tab, string][] = [
    ["node", "Node detail"],
    ["finding", "Finding"],
    ["policy", "Policy"],
    ["remediation", "Remediation"],
    ["logs", "Logs"],
    ["notes", "Notes"],
  ];
  return (
    <>
      <div style={drawerTabStrip}>
        {TABS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            style={drawerTab(tab === id)}
          >
            {label}
          </button>
        ))}
      </div>
      <div style={{ overflowY: "auto", padding: "0 16px 20px", flex: 1 }}>
        {tab === "node" && (
          <>
            <div
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: "var(--cg-text-primary)",
                marginTop: 16,
                wordBreak: "break-all",
              }}
            >
              {node.label}
            </div>
            <div
              style={{
                fontSize: 12,
                color: "var(--cg-text-muted)",
                marginTop: 4,
              }}
            >
              {TIER_LABEL[node.tier]} · blast radius{" "}
              <b style={{ color: "var(--cg-text-primary)" }}>
                {REACH[node.id] ?? 0}
              </b>{" "}
              downstream
            </div>
            {onExpandChain && (rel.up.length > 0 || rel.down.length > 0) && (
              <button
                type="button"
                onClick={() => onExpandChain(node.id)}
                style={{
                  ...catalogCta,
                  marginTop: 14,
                  color: "var(--cg-text-primary)",
                  border: "1px solid var(--cg-border)",
                }}
              >
                <GitBranch size={14} /> Expand dependency chain ·{" "}
                {rel.up.length + rel.down.length}
                <ChevronRight size={13} style={{ marginLeft: 2 }} />
              </button>
            )}
            <GroupHead>Resource type</GroupHead>
            <Field k="Type" v={f?.resourceType ?? TIER_LABEL[node.tier]} />
            <GroupHead>Cloud & location</GroupHead>
            <Field k="Cloud" v={f?.cloud} />
            <Field k="Account / Subscription" v={f?.account} />
            <Field k="Region" v={f?.region} />
            <Field k="VPC / Subnet" v={f?.vpc} />
            {marked[node.id] && (
              <>
                <GroupHead>Mark note</GroupHead>
                <div
                  style={{
                    fontSize: 12.5,
                    color: "var(--cg-text-primary)",
                    lineHeight: 1.5,
                  }}
                >
                  {marked[node.id].note || "—"}
                </div>
              </>
            )}
            <MoreDetail
              rows={[
                ["Resource ID", node.id],
                [
                  "ARN",
                  `arn:aws:${node.kind}:${f?.region ?? "us-west-2"}:${f?.account ?? "9021"}:${node.label}`,
                ],
                ["Tags", "env=prod, team=platform, managed-by=terraform"],
                ["Upstream (data in)", rel.up.length],
                ["Downstream (data out)", rel.down.length],
                [
                  "Public exposure",
                  f?.category === "Public bucket" ? "Yes" : "No",
                ],
                [
                  "Encryption at rest",
                  f?.category?.includes("Unencrypted") ? "Disabled" : "Enabled",
                ],
              ]}
            />
          </>
        )}
        {tab === "finding" && (
          <div style={{ marginTop: 8 }}>
            <div
              style={{
                fontSize: 12,
                color: f ? "var(--cg-text-primary)" : "var(--cg-text-muted)",
                fontStyle: f ? "normal" : "italic",
                marginBottom: 4,
              }}
            >
              {f
                ? "Finding — this resource is misconfigured or exposed"
                : "No finding on this resource"}
            </div>
            <GroupHead>What is it</GroupHead>
            <Field k="Category" v={f?.category} />
            <Field
              k="Severity"
              v={f ? <SevChip sev={f.severity} /> : undefined}
            />
            {node.message && <Field k="Detail" v={node.message} />}
            <GroupHead>Status</GroupHead>
            <Field k="Status" v={f?.status} />
            <Field k="First seen" v={f?.firstSeen} />
            <Field k="Last seen" v={f?.lastSeen} />
            <Field k="Age (days open)" v={f?.ageDays} />
            {f && (
              <MoreDetail
                rows={[
                  ["Finding ID", f.id],
                  ["Detector / rule", `cg-detect-${f.controlId}`],
                  ["Scanner", "CloudGuard Posture"],
                  ["Evidence", node.message ?? "Config snapshot attached"],
                  [
                    "CVSS",
                    (
                      {
                        Critical: "9.1",
                        High: "7.4",
                        Medium: "5.2",
                        Low: "3.1",
                        Informational: "0.0",
                      } as Record<string, string>
                    )[f.severity] ?? "5.2",
                  ],
                  [
                    "Exploit maturity",
                    f.category?.includes("CVE") ? "Public PoC" : "Unproven",
                  ],
                ]}
              />
            )}
          </div>
        )}
        {tab === "policy" && (
          <div style={{ marginTop: 8 }}>
            <GroupHead>Compliance & context</GroupHead>
            <Field k="Framework" v={f?.framework} />
            <Field k="Control ID" v={f?.controlId} />
            <Field k="Owner / team" v={f?.owner} />
            <Field k="Suppressed / accepted" v={f?.suppressed} />
            <MoreDetail
              rows={[
                ["Attached policy", `${node.label}-policy`],
                ["Effective permissions", "s3:*, kms:Decrypt (scoped)"],
                ["Last evaluated", f?.lastSeen ?? "2026-06-30 04:12"],
                ["Exception owner", f?.owner ?? "—"],
                ["Guardrail", "Deny public ACL (SCP)"],
              ]}
            />
          </div>
        )}
        {tab === "remediation" && (
          <>
            <RemediationTimeline items={remediationFor(node.id, !!f)} />
            <MoreDetail
              rows={[
                ["SLA due", f?.severity === "Critical" ? "24h" : "7d"],
                ["Ticket", `SEC-${1200 + (REACH[node.id] ?? 0)}`],
                ["Runbook", "rb/remediate-public-exposure"],
                ["Auto-remediation", "Available (dry-run)"],
              ]}
            />
          </>
        )}
        {tab === "logs" && (
          <>
            <LogList
              logs={logsFor([
                { id: node.id, label: node.label, hasFinding: !!f },
              ])}
            />
            <MoreDetail
              rows={[
                ["Log source", "CloudTrail + VPC Flow"],
                ["Retention", "90 days"],
                ["Query", `resource.id = "${node.id}"`],
              ]}
            />
          </>
        )}
        {tab === "notes" && (
          <NotesPanel
            notes={noteApi.notes}
            onAdd={noteApi.add}
            placeholder={`Add a note — mentioning ${node.label}…`}
          />
        )}
      </div>
    </>
  );
}

// issue Notes sub-view — a hook wrapper so useNotes isn't called conditionally
function IssueNotes({ issueId, title }: { issueId: string; title: string }) {
  const api = useNotes(issueId);
  return (
    <NotesPanel
      notes={api.notes}
      onAdd={api.add}
      placeholder={`Add a note — ${title}…`}
    />
  );
}

function AuxDrawer({
  panel,
  marked,
  onClose,
  onSaveMark,
  onUnmark,
  onSelectMarked,
  onExpandChain,
}: {
  panel: { type: "details" | "mark" | "marklist"; nodeId?: string };
  marked: Record<string, { note: string; ts: number }>;
  onClose: () => void;
  onSaveMark: (id: string, note: string) => void;
  onUnmark: (id: string) => void;
  onSelectMarked: (id: string) => void;
  onExpandChain: (id: string) => void;
}) {
  const node = panel.nodeId ? NODE_BY_ID[panel.nodeId] : undefined;
  const [note, setNote] = React.useState(
    panel.nodeId ? (marked[panel.nodeId]?.note ?? "") : "",
  );
  const closeBtn = (
    <button
      type="button"
      aria-label="Close"
      onClick={onClose}
      style={{
        marginLeft: "auto",
        background: "transparent",
        border: "none",
        color: "var(--cg-text-muted)",
        cursor: "pointer",
        display: "inline-flex",
      }}
    >
      <X size={17} />
    </button>
  );

  if (panel.type === "details" && node) {
    return (
      <div style={drawerShell}>
        <div style={drawerHead}>
          <span
            style={{
              width: 11,
              height: 11,
              borderRadius: 3,
              background: TIER_COLOUR[node.tier],
            }}
          />
          Node details
          {closeBtn}
        </div>
        <NodeDetailBody
          nodeId={node.id}
          marked={marked}
          onExpandChain={onExpandChain}
        />
      </div>
    );
  }

  if (panel.type === "mark" && node) {
    return (
      <div style={drawerShell}>
        <div style={drawerHead}>
          <Star size={15} color="#f5b301" fill="#f5b301" />
          Mark node
          {closeBtn}
        </div>
        <div
          style={{
            padding: "16px",
            flex: 1,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "var(--cg-text-primary)",
              wordBreak: "break-all",
            }}
          >
            {node.label}
          </div>
          <div
            style={{
              fontSize: 12,
              color: "var(--cg-text-muted)",
              marginTop: 3,
            }}
          >
            {TIER_LABEL[node.tier]}
          </div>
          <div style={drawerSec}>Note</div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Why is this flagged? Add context for your team…"
            style={{
              width: "100%",
              minHeight: 120,
              resize: "vertical",
              background: "var(--cg-border-subtle)",
              border: "1px solid var(--cg-border)",
              borderRadius: 8,
              color: "var(--cg-text-primary)",
              fontSize: 13,
              padding: 10,
              fontFamily: "inherit",
              outline: "none",
            }}
          />
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <button
              type="button"
              onClick={() => onSaveMark(node.id, note)}
              style={{
                flex: 1,
                height: 36,
                borderRadius: 8,
                border: "none",
                background: "#f5b301",
                color: "#3a2a00",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              <Star size={14} fill="#3a2a00" /> Save mark
            </button>
            {marked[node.id] && (
              <button
                type="button"
                onClick={() => {
                  onUnmark(node.id);
                  onClose();
                }}
                style={{
                  height: 36,
                  padding: "0 14px",
                  borderRadius: 8,
                  border: "1px solid var(--cg-border)",
                  background: "transparent",
                  color: "var(--cg-text-primary)",
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Remove
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // marklist
  const entries = Object.entries(marked).sort((a, b) => b[1].ts - a[1].ts);
  return (
    <div style={drawerShell}>
      <div style={drawerHead}>
        <Star size={15} color="#f5b301" fill="#f5b301" />
        Marked · {entries.length}
        {closeBtn}
      </div>
      <div style={{ overflowY: "auto", flex: 1 }}>
        {entries.length === 0 && (
          <div
            style={{
              padding: 20,
              fontSize: 12.5,
              color: "var(--cg-text-muted)",
              lineHeight: 1.5,
            }}
          >
            No marked nodes yet. Right-click a node → Mark node to flag it with
            a note.
          </div>
        )}
        {entries.map(([id, m]) => {
          const n = NODE_BY_ID[id];
          if (!n) return null;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelectMarked(id)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "11px 16px",
                border: "none",
                borderBottom: "1px solid var(--cg-border-subtle)",
                background: "transparent",
                color: "var(--cg-text-primary)",
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Star size={12} color="#f5b301" fill="#f5b301" />
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--cg-text-primary)",
                  }}
                >
                  {n.label}
                </span>
                <span
                  style={{
                    marginLeft: "auto",
                    fontSize: 10.5,
                    color: "var(--cg-text-muted)",
                  }}
                >
                  {TIER_LABEL[n.tier]}
                </span>
              </div>
              {m.note && (
                <div
                  style={{
                    fontSize: 11.5,
                    color: "var(--cg-text-muted)",
                    marginTop: 4,
                    lineHeight: 1.45,
                  }}
                >
                  {m.note}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── findings / issues catalog drawer (accordion rows) ─────────────────────────
type NavEntry =
  | { t: "node"; id: string }
  | { t: "chain"; id: string }
  | {
      t: "issue";
      id: string;
      sub:
        | "description"
        | "nodes"
        | "policy"
        | "remediation"
        | "logs"
        | "notes";
    };

function CatalogDrawer({
  mode,
  marked,
  seed,
  onClose,
  onFocusNode,
  onFocusNodeInPath,
  onFocusIssue,
  onExpandChain,
  onMark,
}: {
  mode: "findings" | "issues";
  marked: Record<string, { note: string; ts: number }>;
  seed?: { kind: "finding" | "issue"; id: string } | null;
  onClose: () => void;
  onFocusNode: (id: string | null) => void;
  onFocusNodeInPath: (id: string, path: string[]) => void;
  onFocusIssue: (i: Issue | null) => void;
  onExpandChain: (id: string) => void;
  onMark: (nodeId: string) => void;
}) {
  // a context-menu tag can seed the initial navigation (jump to finding/issue)
  const [nav, setNav] = React.useState<NavEntry[]>(() => {
    if (!seed) return [];
    if (seed.kind === "finding") {
      const f = FINDINGS.find((x) => x.id === seed.id);
      return f ? [{ t: "node", id: f.nodeId }] : [];
    }
    return [{ t: "issue", id: seed.id, sub: "description" }];
  });
  const top = nav.length ? nav[nav.length - 1] : null;
  // multi-select catalog filter (status · severity · category · env · cloud · date)
  const [catFilter, setCatFilter] = React.useState<Set<string>>(new Set());
  const filterGroups =
    mode === "findings" ? FINDING_FILTER_GROUPS : ISSUE_FILTER_GROUPS;
  const shownFindings = FINDINGS.filter((f) => matchFinding(f, catFilter));
  const shownIssues = ISSUES.filter((i) => matchIssue(i, catFilter));

  // reset the stack whenever we switch between Findings and Issues
  React.useEffect(() => {
    setNav([]);
    setCatFilter(new Set());
  }, [mode]);

  // reflect the current view onto the graph. A node opened inside an issue keeps
  // the whole attack-path lit (with the node boxed); a bare finding node is solo.
  React.useEffect(() => {
    if (!top) {
      onFocusNode(null);
      onFocusIssue(null);
    } else if (top.t === "chain") {
      onExpandChain(top.id); // light the node's whole dependency chain
    } else if (top.t === "node") {
      const iss = [...nav].reverse().find((e) => e.t === "issue") as
        | Extract<NavEntry, { t: "issue" }>
        | undefined;
      const path = iss ? ISSUES.find((x) => x.id === iss.id)?.path : undefined;
      if (path) onFocusNodeInPath(top.id, path);
      else onFocusNode(top.id);
    } else {
      onFocusIssue(ISSUES.find((x) => x.id === top.id) ?? null);
    }
  }, [top, nav, onFocusNode, onFocusNodeInPath, onFocusIssue, onExpandChain]);

  const pushNode = (id: string) => setNav((p) => [...p, { t: "node", id }]);
  const pushChain = (id: string) => setNav((p) => [...p, { t: "chain", id }]);
  const pushIssue = (id: string) =>
    setNav((p) => [...p, { t: "issue", id, sub: "description" }]);
  const back = () => setNav((p) => p.slice(0, -1));
  const setSub = (
    sub: "description" | "nodes" | "policy" | "remediation" | "logs" | "notes",
  ) =>
    setNav((p) =>
      p.map((e, i) =>
        i === p.length - 1 && e.t === "issue" ? { ...e, sub } : e,
      ),
    );

  const crumbLabel = (e: NavEntry) => {
    if (e.t === "issue")
      return ISSUES.find((x) => x.id === e.id)?.title ?? e.id;
    const label = NODE_BY_ID[e.id]?.label ?? e.id;
    return e.t === "chain" ? `${label} · chain` : label;
  };

  const closeBtn = (
    <button
      type="button"
      aria-label="Close"
      onClick={onClose}
      style={{
        marginLeft: "auto",
        background: "transparent",
        border: "none",
        color: "var(--cg-text-muted)",
        cursor: "pointer",
        display: "inline-flex",
      }}
    >
      <X size={17} />
    </button>
  );

  // ── header: list mode = title only; detail mode = back arrow + breadcrumb ──
  const header =
    nav.length === 0 ? (
      <div style={drawerHead}>
        {mode === "findings" ? (
          <AlertTriangle size={15} color={C_WARN} />
        ) : (
          <GitBranch size={15} color="#5b9bf0" />
        )}
        {mode === "findings"
          ? `Findings · ${FINDINGS.length}`
          : `Issues · ${ISSUES.length}`}
        {closeBtn}
      </div>
    ) : (
      <div style={{ ...drawerHead, gap: 10 }}>
        <button
          type="button"
          aria-label="Back"
          onClick={back}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--cg-text-primary)",
            cursor: "pointer",
            display: "inline-flex",
          }}
        >
          <ArrowLeft size={17} />
        </button>
        <nav
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            minWidth: 0,
            flexWrap: "nowrap",
            overflow: "hidden",
          }}
        >
          <button
            type="button"
            onClick={() => setNav([])}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--cg-text-muted)",
              cursor: "pointer",
              padding: 0,
              fontSize: 12,
              flexShrink: 0,
            }}
          >
            {mode === "findings" ? "Findings" : "Issues"}
          </button>
          {nav.map((e, i) => (
            <React.Fragment key={`${e.t}-${"id" in e ? e.id : i}`}>
              <span style={{ color: "var(--cg-text-muted)", flexShrink: 0 }}>
                ›
              </span>
              <button
                type="button"
                onClick={() => setNav((p) => p.slice(0, i + 1))}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  fontSize: 12,
                  fontWeight: i === nav.length - 1 ? 600 : 400,
                  color:
                    i === nav.length - 1
                      ? "var(--cg-text-primary)"
                      : "var(--cg-text-muted)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: 150,
                }}
              >
                {crumbLabel(e)}
              </button>
            </React.Fragment>
          ))}
        </nav>
        {closeBtn}
      </div>
    );

  // ── body ──────────────────────────────────────────────────────────────────
  let body: React.ReactNode = null;
  if (!top) {
    body = (
      <>
        <div
          style={{
            padding: "6px 14px 8px",
            fontSize: 11.5,
            color: "var(--cg-text-muted)",
            lineHeight: 1.5,
          }}
        >
          {mode === "findings"
            ? "Single resource — something is misconfigured or exposed."
            : "Connected path of resources — together they form a risk."}
        </div>
        <MultiFilter
          groups={filterGroups}
          selected={catFilter}
          onToggle={(k) =>
            setCatFilter((prev) => {
              const next = new Set(prev);
              if (next.has(k)) next.delete(k);
              else next.add(k);
              return next;
            })
          }
          onClear={() => setCatFilter(new Set())}
        />
        <div style={{ overflowY: "auto", flex: 1 }}>
          {mode === "findings"
            ? shownFindings.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => pushNode(f.nodeId)}
                  onMouseEnter={() => onFocusNode(f.nodeId)}
                  onMouseLeave={() => {
                    if (!top) onFocusNode(null);
                  }}
                  style={catalogRow(false)}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: SEV_COLOUR[f.severity],
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={catalogTitle}>
                      {NODE_BY_ID[f.nodeId]?.label ?? f.title}
                    </span>
                    <span style={catalogSub}>{f.category}</span>
                  </span>
                  <SevChip sev={f.severity} />
                  <ChevronRight size={14} color="var(--cg-text-muted)" />
                </button>
              ))
            : shownIssues.map((iss) => (
                <button
                  key={iss.id}
                  type="button"
                  onClick={() => pushIssue(iss.id)}
                  onMouseEnter={() => onFocusIssue(iss)}
                  onMouseLeave={() => {
                    if (!top) onFocusIssue(null);
                  }}
                  style={catalogRow(false)}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: SEV_COLOUR[iss.risk],
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={catalogTitle}>{iss.title}</span>
                    <span style={catalogSub}>
                      {iss.attackType} · {iss.hopCount} hops ·{" "}
                      {iss.findingIds.length} findings
                    </span>
                  </span>
                  <SevChip sev={iss.risk} />
                  <ChevronRight size={14} color="var(--cg-text-muted)" />
                </button>
              ))}
        </div>
      </>
    );
  } else if (top.t === "node") {
    body = (
      <>
        <NodeDetailBody
          nodeId={top.id}
          marked={marked}
          onExpandChain={pushChain}
        />
        <div
          style={{
            padding: "10px 16px",
            borderTop: "1px solid var(--cg-border)",
          }}
        >
          <button
            type="button"
            onClick={() => onMark(top.id)}
            style={catalogCta}
          >
            <Star size={13} color="#f5b301" fill="#f5b301" /> Mark node
          </button>
        </div>
      </>
    );
  } else if (top.t === "chain") {
    const nodes = chainNodes(top.id);
    body = (
      <div style={{ overflowY: "auto", flex: 1, padding: "6px 16px 20px" }}>
        <div
          style={{
            fontSize: 11.5,
            color: "var(--cg-text-muted)",
            margin: "8px 0",
            lineHeight: 1.5,
          }}
        >
          Dependency chain of{" "}
          <b style={{ color: "var(--cg-text-primary)" }}>
            {NODE_BY_ID[top.id]?.label}
          </b>{" "}
          — lit on the graph. Open a node to inspect it.
        </div>
        {nodes.map((n) => {
          const f = FINDING_BY_NODE[n.id];
          return (
            <button
              key={n.id}
              type="button"
              onClick={() => pushNode(n.id)}
              onMouseEnter={() => onFocusNode(n.id)}
              onMouseLeave={() => onExpandChain(top.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                width: "100%",
                textAlign: "left",
                padding: "9px 0",
                border: "none",
                borderBottom: "1px solid var(--cg-border-subtle)",
                background: "transparent",
                color: "var(--cg-text-primary)",
                cursor: "pointer",
              }}
            >
              <span
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: 2,
                  background: TIER_COLOUR[n.tier],
                  flexShrink: 0,
                }}
              />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={catalogTitle}>{n.label}</span>
                <span style={catalogSub}>{TIER_LABEL[n.tier]}</span>
              </span>
              {f && (
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: SEV_COLOUR[f.severity],
                    flexShrink: 0,
                  }}
                />
              )}
              <ChevronRight size={14} color="var(--cg-text-muted)" />
            </button>
          );
        })}
      </div>
    );
  } else {
    const iss = ISSUES.find((x) => x.id === top.id);
    if (iss) {
      body = (
        <div style={{ overflowY: "auto", flex: 1 }}>
          {/* sub-view selector */}
          <div style={drawerTabStrip}>
            {(
              [
                ["description", "Issue"],
                ["nodes", `Affected · ${iss.path.length}`],
                ["policy", "Policy"],
                ["remediation", "Remediation"],
                ["logs", "Logs"],
                ["notes", "Notes"],
              ] as const
            ).map(([s, label]) => (
              <button
                key={s}
                type="button"
                onClick={() => setSub(s)}
                style={drawerTab(top.sub === s)}
              >
                {label}
              </button>
            ))}
          </div>
          <div style={{ padding: "6px 16px 20px" }}>
            {top.sub === "remediation" && (
              <RemediationTimeline items={remediationFor(iss.id, true)} />
            )}
            {top.sub === "logs" && (
              <LogList
                logs={logsFor(
                  iss.path.map((nid) => ({
                    id: nid,
                    label: NODE_BY_ID[nid]?.label ?? nid,
                    hasFinding: !!FINDING_BY_NODE[nid],
                  })),
                )}
              />
            )}
            {top.sub === "notes" && (
              <IssueNotes issueId={iss.id} title={iss.title} />
            )}
            {top.sub === "description" && (
              <>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: "var(--cg-text-primary)",
                    marginTop: 6,
                  }}
                >
                  {iss.title}
                </div>
                <div
                  style={{
                    fontSize: 11.5,
                    color: "var(--cg-text-muted)",
                    margin: "6px 0 2px",
                  }}
                >
                  Connected path of resources — together they form a risk.
                  Highlighted on the graph.
                </div>
                <IssueSchema iss={iss} />
                <MoreDetail
                  rows={[
                    ["Issue ID", iss.id],
                    ["Entry point", iss.entryPoint],
                    ["Target", iss.target],
                    ["Hops", iss.hopCount],
                    ["Crosses VPC", iss.crossesVpc],
                    ["Involves public", iss.involvesPublic],
                    ["Exploitability", iss.exploitability],
                  ]}
                />
              </>
            )}
            {top.sub === "policy" && (
              <>
                <IssuePolicy iss={iss} />
                <MoreDetail
                  rows={[
                    ["Findings on path", iss.findingIds.join(", ")],
                    ["Min severity", <SevChip key="s" sev={iss.minSeverity} />],
                    ["Suggested action", "Break path at first hop"],
                    [
                      "Blast radius if breached",
                      `${iss.path.length} resources`,
                    ],
                  ]}
                />
              </>
            )}
            {top.sub === "nodes" && (
              <div>
                <div
                  style={{
                    fontSize: 11.5,
                    color: "var(--cg-text-muted)",
                    margin: "4px 0 8px",
                  }}
                >
                  Entry → target. Open a node to inspect it — it is boxed and
                  labelled on the graph.
                </div>
                {iss.path.map((nid, i) => {
                  const n = NODE_BY_ID[nid];
                  if (!n) return null;
                  const f = FINDING_BY_NODE[nid];
                  return (
                    <button
                      key={nid}
                      type="button"
                      onClick={() => pushNode(nid)}
                      // keep the whole attack-path lit; just box the hovered node
                      onMouseEnter={() => onFocusNodeInPath(nid, iss.path)}
                      onMouseLeave={() => onFocusIssue(iss)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 9,
                        width: "100%",
                        textAlign: "left",
                        padding: "9px 0",
                        border: "none",
                        borderBottom: "1px solid var(--cg-border-subtle)",
                        background: "transparent",
                        color: "var(--cg-text-primary)",
                        cursor: "pointer",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 10,
                          color: "var(--cg-text-muted)",
                          width: 16,
                          flexShrink: 0,
                        }}
                      >
                        {i + 1}
                      </span>
                      <span
                        style={{
                          width: 9,
                          height: 9,
                          borderRadius: 2,
                          background: TIER_COLOUR[n.tier],
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={catalogTitle}>{n.label}</span>
                        <span style={catalogSub}>
                          {TIER_LABEL[n.tier]}
                          {f ? ` · ${f.category}` : ""}
                        </span>
                      </span>
                      {f && (
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: SEV_COLOUR[f.severity],
                            flexShrink: 0,
                          }}
                        />
                      )}
                      <ChevronRight size={14} color="var(--cg-text-muted)" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      );
    }
  }

  return (
    <div style={drawerShell}>
      {header}
      {body}
    </div>
  );
}

const catalogTitle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  color: "var(--cg-text-primary)",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};
const catalogSub: React.CSSProperties = {
  display: "block",
  fontSize: 11.5,
  color: "var(--cg-text-muted)",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};
const catalogCta: React.CSSProperties = {
  height: 34,
  width: "100%",
  borderRadius: 7,
  border: "1px solid var(--cg-border)",
  background: "transparent",
  color: "var(--cg-text-primary)",
  fontSize: 12.5,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 7,
};
function catalogRow(isOpen: boolean): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: 9,
    width: "100%",
    textAlign: "left",
    padding: "11px 14px",
    border: "none",
    borderBottom: "1px solid var(--cg-border-subtle)",
    background: isOpen ? "var(--cg-border-subtle)" : "transparent",
    color: "var(--cg-text-primary)",
    cursor: "pointer",
  };
}

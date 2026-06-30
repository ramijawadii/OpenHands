/* eslint-disable i18next/no-literal-string -- CloudGuard explore view (in-main view navigation; body empty for now) */
import React from "react";
import { useParams, useNavigate, useSearchParams } from "react-router";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  Key,
  Lock,
  Unlock,
  Network,
  GitBranch,
  GitCompare,
  Globe,
  Package,
  FileCode,
  FileText,
  FileCheck,
  Bot,
  Cpu,
  Brain,
  Database,
  Cloud,
  Activity,
  AlertTriangle,
  RefreshCw,
  Gavel,
  Eye,
  EyeOff,
  Clock,
  Users,
  Server,
  Layers,
  Boxes,
  Bug,
  Fingerprint,
  Radio,
  Zap,
  Container,
  Workflow,
  Waypoints,
  BadgeCheck,
  Plug,
  Webhook,
  MessageSquare,
  Target,
  Crosshair,
  ClipboardList,
  ScrollText,
  Gauge,
  Wrench,
  Tags,
  Briefcase,
  BookOpen,
  Timer,
  Ticket,
  Share2,
  Download,
  Blocks,
  CircleDot,
} from "lucide-react";
import { NAVIGATION, slugify } from "#/components/features/sidebar/sidebar";
import { Page } from "#/components/admin/admin-kit";

type LucideIcon = React.ComponentType<{ size?: number; color?: string }>;

/**
 * Brief, industry-conventional tab labels keyed by the full descriptive item
 * label. The full text is preserved in NAVIGATION (used elsewhere / later); the
 * tab bar shows the concise name. Unmapped labels fall back to the full text.
 */
export const SHORT_LABEL: Record<string, string> = {
  // Discovery & Inventory
  "Multi-cloud resource graph (AWS, Azure, GCP, OCI, Alibaba)":
    "Resource Graph",
  "Shadow asset detection": "Shadow Assets",
  "Tagging & ownership policy": "Tagging & Ownership",
  "Asset change timeline": "Change Timeline",
  "Unmanaged & orphaned resource detection": "Orphaned Resources",
  "Internet-facing asset discovery": "Internet-Facing",
  "Exposed ports, services & certificates": "Exposed Services",
  "Subdomain & DNS enumeration": "DNS & Subdomains",
  "Unknown / unmanaged asset alerts": "Unknown Assets",
  "Attacker-view exposure scoring": "Exposure Scoring",
  "Attack path visualization": "Attack Paths",
  "Toxic combination detection": "Toxic Combinations",
  "Blast radius analysis": "Blast Radius",
  "Business context scoring (criticality, revenue, data sensitivity)":
    "Business Context",
  "Exploitability-weighted risk prioritization": "Risk Prioritization",
  // Identity
  "Role sprawl & over-privilege detection": "Over-Privilege",
  "MFA enforcement & gap analysis": "MFA Gaps",
  "PAM & privileged session management": "PAM",
  "JIT access & standing access removal": "JIT Access",
  "Cross-account trust chain analysis": "Trust Chains",
  "Admin account hardening": "Admin Hardening",
  "Service account inventory & permissions audit": "Service Accounts",
  "API token & key lifecycle management": "Keys & Tokens",
  "Workload identities (OIDC, federated, SPIFFE/SPIRE)": "Workload Identities",
  "AI agent identities & permission scoping": "Agent Identities",
  "Credential rotation enforcement": "Credential Rotation",
  "Effective permissions graph": "Effective Permissions",
  "Dormant & orphaned identity detection": "Dormant Identities",
  "Identity–resource toxic combinations": "Toxic Combinations",
  "Lateral movement paths from identity": "Lateral Movement",
  "Privilege escalation path analysis": "Privilege Escalation",
  // Posture & Governance
  "Misconfiguration detection across all cloud services": "Misconfigurations",
  "Drift detection vs IaC baseline": "Drift Detection",
  "Secure score (per account, per service, per region)": "Secure Score",
  "Auto-remediation & suggested fixes": "Auto-Remediation",
  "Multi-cloud policy enforcement": "Policy Enforcement",
  "CVE scanning across workloads, images & OSes": "CVE Scanning",
  "Risk-based prioritization (CVSS + exploitability + runtime context)":
    "Risk Prioritization",
  "Patch tracking & SLA management": "Patch & SLA",
  "Remediation validation & re-scan": "Remediation Validation",
  "Zero-day exposure tracking": "Zero-Day Exposure",
  "CIS benchmarks (AWS / GCP / Azure)": "CIS Benchmarks",
  "NIST 800-53 & CSF": "NIST 800-53",
  "PCI-DSS v4": "PCI-DSS",
  HIPAA: "HIPAA",
  "SOC 2 Type II": "SOC 2",
  "ISO 27001": "ISO 27001",
  "GDPR & regional frameworks": "GDPR",
  "Continuous evidence collection": "Evidence Collection",
  "Audit-ready reporting & export": "Audit Reporting",
  // Code-to-Cloud
  "Terraform scanning (pre-deploy, OPA / Sentinel gates)": "Terraform",
  "CloudFormation / ARM / Bicep analysis": "CloudFormation/ARM",
  "Helm & Kubernetes manifest scanning": "K8s Manifests",
  "CI/CD pipeline gates & break-the-build": "Pipeline Gates",
  "Policy-as-code enforcement": "Policy-as-Code",
  "IaC-to-runtime drift detection": "IaC Drift",
  "Application inventory & ownership mapping": "App Inventory",
  "Code-level vulnerability context": "SAST",
  "SCA — open source risk in application layer": "SCA",
  "Developer-facing findings & IDE integration": "IDE Integration",
  "App risk score correlated to infrastructure context": "App Risk Score",
  "Reachability analysis (is the vulnerability actually exploitable)":
    "Reachability",
  "Dependency scanning (direct + transitive)": "Dependencies",
  "SBOM generation (CycloneDX / SPDX)": "SBOM",
  "VEX statements & vulnerability exceptions": "VEX",
  "Artifact signing — SLSA L1 / L2 / L3": "SLSA Signing",
  "Provenance & Sigstore transparency log": "Provenance",
  "Malicious package detection": "Malicious Packages",
  "Git history & PR diff scanning": "Git Scanning",
  "Pre-commit hooks & branch scanning": "Pre-Commit Hooks",
  "CI/CD variable & pipeline secret exposure": "Pipeline Secrets",
  "Config maps & env file scanning": "Config & Env",
  "Cloud-native secret store adoption tracking": "Secret Stores",
  "Verified vs unverified secret triage": "Secret Triage",
  // API Security
  "Automatic API endpoint discovery (agentless + traffic-based)":
    "Endpoint Discovery",
  "Shadow API detection (undocumented, unregistered endpoints)": "Shadow APIs",
  "Zombie API detection (deprecated but still active)": "Zombie APIs",
  "Internal vs external API classification": "API Classification",
  "API ownership & team mapping": "API Ownership",
  "OpenAPI / GraphQL / gRPC schema registry": "Schema Registry",
  "OpenAPI spec drift (schema vs actual traffic)": "Spec Drift",
  "Authentication & authorization schema review": "Auth Schema",
  "Insecure defaults (verbose errors, no rate limits, open CORS)":
    "Insecure Defaults",
  "mTLS & transport security enforcement": "mTLS",
  "API versioning risk (old versions still reachable)": "Versioning Risk",
  "GraphQL introspection & depth limit exposure": "GraphQL Exposure",
  "API1 — Broken object level authorization (BOLA)": "API1 — BOLA",
  "API2 — Broken authentication": "API2 — Broken Auth",
  "API3 — Broken object property level authorization": "API3 — BOPLA",
  "API4 — Unrestricted resource consumption": "API4 — Resource Consumption",
  "API5 — Broken function level authorization (BFLA)": "API5 — BFLA",
  "API6 — Unrestricted access to sensitive business flows":
    "API6 — Business Flows",
  "API7 — Server-side request forgery (SSRF)": "API7 — SSRF",
  "API8 — Security misconfiguration": "API8 — Misconfiguration",
  "API9 — Improper inventory management": "API9 — Inventory Mgmt",
  "API10 — Unsafe consumption of APIs": "API10 — Unsafe Consumption",
  "L7 real-time traffic inspection": "L7 Inspection",
  "Anomalous request pattern detection": "Anomaly Detection",
  "Rate limit enforcement & abuse detection": "Rate Limiting",
  "Bot vs human traffic classification": "Bot Detection",
  "Credential stuffing & brute force on API endpoints": "Credential Stuffing",
  "Data exfiltration via API response analysis": "Data Exfiltration",
  "API-specific attack signatures (injection, fuzzing, scraping)":
    "Attack Signatures",
  "Behavioral baseline per endpoint": "Behavioral Baseline",
  "Sequence anomaly (abnormal call chains)": "Sequence Anomaly",
  "Privilege escalation via API": "Privilege Escalation",
  "Lateral movement through internal APIs": "Lateral Movement",
  "Alert correlation with CDR & identity layer": "Alert Correlation",
  "API catalog & lifecycle management": "API Catalog",
  "Deprecation & sunset policy enforcement": "Deprecation Policy",
  "Sensitive data in API responses (PII, tokens, secrets)": "Sensitive Data",
  "Regulatory mapping (GDPR, PCI-DSS, HIPAA)": "Regulatory Mapping",
  "Consumer access audit (who calls what, how often)": "Consumer Audit",
  "API SLA & uptime risk scoring": "SLA Scoring",
  // Workload & Runtime
  "VM vulnerability scanning & patching": "VM Scanning",
  "Serverless function security (Lambda, Cloud Functions)":
    "Serverless Security",
  "Runtime anomaly detection (process, file, syscall)": "Runtime Anomaly",
  "Malware detection & quarantine": "Malware Detection",
  "File integrity monitoring (FIM)": "FIM",
  "eBPF-based kernel-level visibility": "eBPF Visibility",
  "Cluster posture (kube-bench, CIS K8s benchmarks)": "Cluster Posture",
  "RBAC analysis & violations": "RBAC Analysis",
  "Container image scanning (CVE, malware, embedded secrets)": "Image Scanning",
  "Registry security & image signing (Cosign)": "Registry & Signing",
  "Runtime container defense & drift detection": "Runtime Defense",
  "Admission controller policy enforcement": "Admission Control",
  "VPC & security group analysis": "VPC & Security Groups",
  "NACL & firewall rule audit": "Firewall Rules",
  "Flow log ingestion & anomaly detection": "Flow Logs",
  "DDoS & WAF coverage assessment": "DDoS & WAF",
  "East-west micro-segmentation enforcement": "Micro-Segmentation",
  "Zero trust network policy gaps": "Zero Trust",
  "Managed service misconfiguration (RDS, managed K8s, queues)":
    "Managed Services",
  "Event-driven attack surface (triggers, event buses)": "Event-Driven Surface",
  "Privilege escalation via serverless triggers": "Trigger Escalation",
  "Cold-start & ephemeral workload blind spots": "Ephemeral Blind Spots",
  "Function-to-function permission sprawl": "Function Permissions",
  // Data & SaaS
  "Data store discovery & classification (S3, RDS, BigQuery, Blob, Snowflake)":
    "Data Discovery",
  "PII / PCI / PHI / PHD sensitive data detection": "Sensitive Data",
  "Encryption coverage (at-rest & in-transit)": "Encryption Coverage",
  "Excess data access (who can reach what data)": "Excess Access",
  "Data flow mapping (how data moves between services)": "Data Flow Mapping",
  "DLP policy enforcement & violation alerting": "DLP",
  "Data residency & sovereignty compliance": "Data Residency",
  "M365 tenant config, sharing & guest access": "Microsoft 365",
  "Google Workspace DLP & guest policies": "Google Workspace",
  "Salesforce org permissions & IP restrictions": "Salesforce",
  "GitHub org security & branch protection": "GitHub",
  "Slack & collaboration tool posture": "Slack",
  "OAuth app inventory, scope audit & risk scoring": "OAuth Apps",
  "Shadow SaaS detection & unmanaged app access": "Shadow SaaS",
  // Detection & Response
  "Real-time log ingestion & normalization (CloudTrail, Azure Monitor, GCP)":
    "Log Ingestion",
  "SIEM-style correlation across cloud telemetry": "Correlation",
  "Behavioral anomaly detection (UEBA)": "UEBA",
  "Lateral movement & pivot detection": "Lateral Movement",
  "Privilege escalation detection": "Privilege Escalation",
  "API abuse & credential stuffing signals": "API Abuse",
  "Multi-cloud alert deduplication & normalization": "Alert Dedup",
  "IOC & IOA feed ingestion (commercial + open source)": "IOC/IOA Feeds",
  "MITRE ATT&CK cloud matrix coverage mapping": "MITRE ATT&CK",
  "Adversary campaign & TTP tracking": "TTP Tracking",
  "Threat actor attribution & profiling": "Actor Attribution",
  "Intelligence-enriched alert context": "Enriched Context",
  "Cloud provider CVE & advisory watch": "CVE Watch",
  "Alert triage & case management": "Triage & Cases",
  "SOAR playbook automation": "SOAR Playbooks",
  "Automated containment (isolate, credential revoke, quarantine)":
    "Auto-Containment",
  "Forensic timeline & evidence collection": "Forensics",
  "Post-incident blast radius assessment": "Blast Radius",
  "MTTR tracking & SLA reporting": "MTTR & SLA",
  "Runbook library & response templates": "Runbooks",
  "SIEM forwarding (Splunk, Microsoft Sentinel, Chronicle, QRadar)":
    "SIEM Forwarding",
  "Ticketing (Jira, ServiceNow, PagerDuty, Linear)": "Ticketing",
  "EDR / XDR bidirectional telemetry (CrowdStrike, SentinelOne, Defender)":
    "EDR/XDR",
  "Chat ops (Slack, Teams)": "ChatOps",
  "Webhook & REST API automation": "Webhooks & API",
  "SOAR connectors (Palo Alto XSOAR, Swimlane, Tines)": "SOAR Connectors",
  // AI & Emerging Threats
  "AI workload & model inventory": "Model Inventory",
  "Training infrastructure misconfiguration": "Training Infra",
  "Model access controls & least privilege": "Model Access",
  "AI BOM (model cards, weights, training data lineage)": "AI-BOM",
  "Shadow AI & unregistered model detection": "Shadow AI",
  "Prompt injection detection & input filtering": "Prompt Injection",
  "Sensitive data leakage from LLM outputs": "Data Leakage",
  "Model theft & extraction risk": "Model Theft",
  "Insecure plugin / tool / MCP integrations": "Insecure Plugins",
  "LLM endpoint inventory & public exposure": "LLM Endpoints",
  "Jailbreak & policy bypass detection": "Jailbreak Detection",
  "Agent permission scoping & least privilege": "Agent Permissions",
  "Agent action audit logs & observability": "Agent Audit Logs",
  "Agentic workflow blast radius mapping": "Workflow Blast Radius",
  "Multi-agent trust chain analysis": "Trust Chains",
  "Runtime agent behavioral monitoring & anomaly detection":
    "Behavioral Monitoring",
  "Human-in-the-loop enforcement policy": "Human-in-the-Loop",
  "Zero-day cloud service vulnerability watch": "Zero-Day Watch",
  "Continuous threat exposure management cycles": "CTEM Cycles",
  "Adversarial ML & model poisoning tracking": "Adversarial ML",
  "New attack technique simulation & purple teaming": "Purple Teaming",
  "Exposure validation (confirm if attack paths are exploitable)":
    "Exposure Validation",
};

const B7 = [
  "Overview",
  "Issues",
  "Findings",
  "Security graph",
  "Agent actions",
  "Policy",
  "Reports",
];

type Spec = { archetype: "A" | "B" | "C" | "G" | "S"; views: string[] };

// Level-3 view strips per sub-tab, from the navigation IA spec (archetype-driven).
const VIEW_SPEC: Record<string, Spec> = {
  "1.1": {
    archetype: "A",
    views: ["Overview", "Inventory", "Timeline", "Findings", "Policy"],
  },
  "1.2": {
    archetype: "A",
    views: ["Overview", "Inventory", "Findings", "Policy"],
  },
  "1.3": { archetype: "G", views: [] },
  "2.1": { archetype: "B", views: B7 },
  "2.2": { archetype: "B", views: B7 },
  "2.3": { archetype: "G", views: [] },
  "3.1": { archetype: "B", views: B7 },
  "3.2": { archetype: "B", views: B7 },
  "3.3": {
    archetype: "S",
    views: ["Overview", "Frameworks", "Evidence", "Reports"],
  },
  "4.1": { archetype: "B", views: B7 },
  "4.2": { archetype: "B", views: B7 },
  "4.3": {
    archetype: "B",
    views: ["Overview", "Issues", "Findings", "SBOM", "Policy", "Reports"],
  },
  "4.4": {
    archetype: "B",
    views: ["Overview", "Issues", "Findings", "Policy"],
  },
  "5.1": {
    archetype: "A",
    views: ["Overview", "Inventory", "Findings", "Policy"],
  },
  "5.2": {
    archetype: "B",
    views: ["Overview", "Issues", "Findings", "Policy", "Reports"],
  },
  "5.3": { archetype: "S", views: ["Scorecard"] },
  "5.4": {
    archetype: "C",
    views: ["Overview", "Detections", "Traffic", "Security graph", "Reports"],
  },
  "5.5": {
    archetype: "C",
    views: [
      "Overview",
      "Detections",
      "Agent actions",
      "Security graph",
      "Reports",
    ],
  },
  "5.6": {
    archetype: "S",
    views: ["Overview", "Catalog", "Evidence", "Reports"],
  },
  "6.1": { archetype: "B", views: B7 },
  "6.2": { archetype: "B", views: B7 },
  "6.3": {
    archetype: "B",
    views: [
      "Overview",
      "Issues",
      "Findings",
      "Security graph",
      "Policy",
      "Reports",
    ],
  },
  "6.4": {
    archetype: "B",
    views: ["Overview", "Issues", "Findings", "Security graph", "Policy"],
  },
  "7.1": {
    archetype: "A",
    views: ["Overview", "Inventory", "Findings", "Security graph", "Policy"],
  },
  "7.2": {
    archetype: "A",
    views: ["Overview", "Inventory", "Findings", "Policy"],
  },
  "8.1": {
    archetype: "C",
    views: [
      "Overview",
      "Detections",
      "Agent actions",
      "Security graph",
      "Reports",
    ],
  },
  "8.2": {
    archetype: "S",
    views: ["Overview", "Feeds", "ATT&CK coverage", "Reports"],
  },
  "8.3": {
    archetype: "C",
    views: ["Overview", "Cases", "Agent actions", "Timeline", "Reports"],
  },
  "8.4": { archetype: "S", views: ["Overview", "Connectors", "Settings"] },
  "9.1": {
    archetype: "A",
    views: ["Overview", "Inventory", "Findings", "Policy"],
  },
  "9.2": {
    archetype: "B",
    views: ["Overview", "Issues", "Findings", "Security graph", "Policy"],
  },
  "9.3": {
    archetype: "C",
    views: [
      "Overview",
      "Agent actions",
      "Issues",
      "Security graph",
      "Policy",
      "Reports",
    ],
  },
  "9.4": {
    archetype: "C",
    views: [
      "Overview",
      "Simulations",
      "Detections",
      "Security graph",
      "Reports",
    ],
  },
};

/**
 * Main explore view (IA spec, Level 3). A breadcrumb (Domain - Sub-tab) anchors
 * the panel; the underline tab strip = the archetype-driven VIEWS (category);
 * the pill row beneath = the sub-tab's capabilities as FILTER chips. Graph-native
 * sub-tabs (archetype G) drop the view strip for a canvas + filter bar. Bodies
 * are intentionally empty for now.
 */
// Meaningful icon per capability — first matching keyword wins.
const ICON_RULES: [RegExp, LucideIcon][] = [
  [/mfa/i, KeyRound],
  [/pam|privileged session/i, Lock],
  [
    /jit|standing access|dormant|orphan|deprecat|sunset|cold-start|ephemeral|change timeline|asset change/i,
    Clock,
  ],
  [/over-privilege|role sprawl/i, ShieldAlert],
  [/trust chain|cross-account/i, Workflow],
  [/admin account|hardening/i, ShieldCheck],
  [/service account/i, Bot],
  [/token|api key|key lifecycle|oauth/i, Key],
  [/workload identit|fingerprint/i, Fingerprint],
  [/rotation/i, RefreshCw],
  [
    /effective permission|trust|lateral|segmentation|zero trust|vpc|security group|nacl|firewall|relationship/i,
    Network,
  ],
  [/lateral movement/i, Waypoints],
  [/privilege escalation/i, ShieldAlert],
  [/resource graph|attack path|graph/i, GitBranch],
  [/shadow/i, EyeOff],
  [/tagging|ownership/i, Tags],
  [
    /internet-facing|external|dns|subdomain|residency|sovereignty|region/i,
    Globe,
  ],
  [
    /ports|services|certificate|vm |virtual machine|managed service|paas/i,
    Server,
  ],
  [/exposure|reachab|exploitab/i, Eye],
  [/blast radius/i, Crosshair],
  [/business context/i, Briefcase],
  [/misconfigurat|toxic|insecure default|anomal/i, AlertTriangle],
  [/drift|spec drift|versioning/i, GitCompare],
  [/secure score|score|rate limit|sla|uptime|gauge/i, Gauge],
  [/remediation|patch|fix/i, Wrench],
  [/policy|admission|gate|guardrail|enforcement/i, Gavel],
  [
    /cve|vulnerab|malware|malicious|bug|zero-day|zero day|signature|bola|bfla|ssrf|injection|brute force|credential stuffing|jailbreak/i,
    Bug,
  ],
  [
    /terraform|cloudformation|arm|bicep|iac|manifest|schema|openapi|graphql|grpc/i,
    FileCode,
  ],
  [
    /helm|kubernetes|k8s|cluster|container|image scan|registry|rbac/i,
    Container,
  ],
  [/pipeline|ci\/cd|git history|pr diff|github|pre-commit/i, GitBranch],
  [/sbom|dependency|package|catalog|inventory/i, Package],
  [/vex|evidence|report|consumer audit/i, FileText],
  [
    /signing|slsa|cosign|provenance|sigstore|compliance|framework|cis|nist|pci|hipaa|soc 2|iso |gdpr|att&ck|attestation/i,
    BadgeCheck,
  ],
  [/secret/i, KeyRound],
  [/config|env file/i, FileCode],
  [/traffic|l7|behavioral|baseline|flow log|ueba|detection/i, Activity],
  [/sequence|soar|playbook|runbook flow/i, Workflow],
  [/bot vs human/i, Bot],
  [/exfiltrat|theft|extraction/i, Download],
  [
    /sensitive data|pii|data store|classification|data flow|data security|encryption|dlp/i,
    Database,
  ],
  [/ddos|waf|dlp policy/i, Shield],
  [
    /m365|microsoft|google workspace|salesforce|saas|slack|teams|collaboration|chat/i,
    Cloud,
  ],
  [/log ingestion|siem/i, ScrollText],
  [/ioc|ioa|feed|intel|advisory/i, Radio],
  [/mitre|simulation|purple team|exposure validation|ctem/i, Target],
  [/campaign|adversary|actor|attribution|ttp/i, Crosshair],
  [/triage|case/i, ClipboardList],
  [/containment|isolate|quarantine|edr|xdr/i, ShieldCheck],
  [/mttr/i, Timer],
  [/runbook|template/i, BookOpen],
  [/forwarding/i, Share2],
  [/ticketing/i, Ticket],
  [/webhook|rest api/i, Webhook],
  [/connector|integration/i, Plug],
  [/model|ai bom|training|adversarial ml/i, Brain],
  [/ebpf|kernel/i, Cpu],
  [/fim|file integrity/i, FileCheck],
  [/serverless|lambda|function|event-driven|trigger|event bus/i, Zap],
  [/agent/i, Bot],
  [/prompt injection|leakage|leak/i, MessageSquare],
  [/plugin|mcp|tool/i, Blocks],
  [/jailbreak/i, Unlock],
  [/rbac|user/i, Users],
  [/api/i, Globe],
  [/layer/i, Layers],
  [/box|object/i, Boxes],
];
function iconFor(label: string): LucideIcon {
  const hit = ICON_RULES.find(([re]) => re.test(label));
  return hit ? hit[1] : CircleDot;
}

// distinct fallbacks so two capabilities in the SAME sub-tab never share an icon
const ICON_POOL: LucideIcon[] = [
  CircleDot,
  Eye,
  Activity,
  Layers,
  Boxes,
  Server,
  Globe,
  Network,
  Database,
  Gauge,
  Tags,
  Workflow,
  Radio,
  Target,
  ScrollText,
  Briefcase,
  Timer,
  Share2,
];
function dedupeIcons(items: { label: string }[]): LucideIcon[] {
  const used = new Set<LucideIcon>();
  return items.map((it) => {
    let icon = iconFor(it.label);
    if (used.has(icon)) {
      icon = ICON_POOL.find((p) => !used.has(p)) ?? icon;
    }
    used.add(icon);
    return icon;
  });
}

export default function ExploreView() {
  const { domainId, subtabId, viewId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const contentRef = React.useRef<HTMLDivElement | null>(null);

  // resolve by human-readable name slug (URL = /explore/<domain>/<sub-tab>/<capability>)
  const domain = NAVIGATION.find((d) => slugify(d.label) === domainId);
  const subtab = domain?.subtabs.find((s) => slugify(s.label) === subtabId);
  const viewSlug = searchParams.get("view");
  const capIcons = React.useMemo(
    () => dedupeIcons(subtab?.items ?? []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [subtab?.id],
  );

  // Fade the content on capability/view change WITHOUT remounting it — so
  // screen-reader focus and scroll position survive (respects reduced-motion).
  React.useEffect(() => {
    const el = contentRef.current;
    if (!el || typeof el.animate !== "function") return;
    const reduce = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduce) return;
    el.animate(
      [
        { opacity: 0, transform: "translateY(4px)" },
        { opacity: 1, transform: "none" },
      ],
      { duration: 160, easing: "ease" },
    );
  }, [viewId, viewSlug]);

  if (!domain || !subtab) {
    return (
      <div
        data-testid="explore-view"
        style={{ height: "100%", width: "100%" }}
      />
    );
  }

  const spec = VIEW_SPEC[subtab.id] ?? { archetype: "B" as const, views: B7 };
  const isGraph = spec.archetype === "G";
  const capSlug = (i: number) =>
    slugify(SHORT_LABEL[subtab.items[i].label] ?? subtab.items[i].label);
  const activeCap = Math.max(
    0,
    subtab.items.findIndex((_, i) => capSlug(i) === viewId),
  );
  const view = Math.max(
    0,
    spec.views.findIndex((v) => slugify(v) === viewSlug),
  );
  const capItem = subtab.items[activeCap] ?? subtab.items[0];
  const capLabel = capItem ? (SHORT_LABEL[capItem.label] ?? capItem.label) : "";

  const goCap = (i: number) => {
    const q = searchParams.toString();
    navigate(
      `/explore/${slugify(domain.label)}/${slugify(subtab.label)}/${capSlug(i)}${q ? `?${q}` : ""}`,
    );
  };
  const goView = (i: number) => {
    const next = new URLSearchParams(searchParams);
    if (i === 0) next.delete("view");
    else next.set("view", slugify(spec.views[i]));
    setSearchParams(next);
  };
  // automatic-activation roving tablist: ←/→ move + activate the sibling tab
  const onTabKey = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    idx: number,
    count: number,
  ) => {
    let next = idx;
    if (e.key === "ArrowRight" || e.key === "ArrowDown")
      next = (idx + 1) % count;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp")
      next = (idx - 1 + count) % count;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = count - 1;
    else return;
    e.preventDefault();
    const sibling = e.currentTarget.parentElement?.children[next] as
      | HTMLElement
      | undefined;
    sibling?.focus();
    sibling?.click();
  };

  // Primary navigation — capability underline tabs (de-duped meaningful icons)
  const capTabs = (
    <div
      role="tablist"
      aria-label={`${subtab.label} capabilities`}
      style={{
        display: "flex",
        alignItems: "stretch",
        gap: 22,
        rowGap: 2,
        flexWrap: "wrap",
        borderBottom: "1px solid var(--cg-border-card)",
        marginBottom: 16,
      }}
    >
      {subtab.items.map((item, i) => {
        const on = i === activeCap;
        const Icon = capIcons[i] ?? CircleDot;
        return (
          <button
            key={item.label}
            type="button"
            role="tab"
            aria-selected={on}
            tabIndex={on ? 0 : -1}
            title={item.label}
            onClick={() => goCap(i)}
            onKeyDown={(e) => onTabKey(e, i, subtab.items.length)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              background: "transparent",
              border: "none",
              borderBottom: `2px solid ${on ? "var(--cg-accent)" : "transparent"}`,
              marginBottom: -1,
              padding: "0 1px 10px",
              color: on ? "var(--cg-text-primary)" : "var(--cg-text-nav)",
              fontSize: 13,
              fontWeight: on ? 600 : 400,
              whiteSpace: "nowrap",
              cursor: "pointer",
              flexShrink: 0,
              transition: "color 120ms ease",
            }}
          >
            <Icon
              size={14}
              color={on ? "var(--cg-accent)" : "var(--cg-text-muted)"}
            />
            {SHORT_LABEL[item.label] ?? item.label}
          </button>
        );
      })}
    </div>
  );

  // Secondary navigation — view pills (deep-linked via ?view=)
  const viewPills = spec.views.length ? (
    <div
      role="tablist"
      aria-label={`${capLabel} views`}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        flexWrap: "wrap",
      }}
    >
      {spec.views.map((v, i) => {
        const on = i === view;
        return (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={on}
            tabIndex={on ? 0 : -1}
            onClick={() => goView(i)}
            onKeyDown={(e) => onTabKey(e, i, spec.views.length)}
            style={{
              height: 30,
              padding: "0 12px",
              borderRadius: 7,
              border: `1px solid ${on ? "var(--cg-accent)" : "var(--cg-border-card)"}`,
              background: on ? "var(--cg-accent-bg)" : "transparent",
              color: on ? "var(--cg-text-primary)" : "var(--cg-text-nav)",
              fontSize: 12.5,
              fontWeight: on ? 600 : 400,
              whiteSpace: "nowrap",
              cursor: "pointer",
              flexShrink: 0,
              transition:
                "background 120ms ease, color 120ms ease, border-color 120ms ease",
            }}
          >
            {v}
          </button>
        );
      })}
    </div>
  ) : null;

  const crumb: React.CSSProperties = {
    background: "transparent",
    border: "none",
    padding: 0,
    font: "inherit",
    color: "var(--cg-text-muted)",
    cursor: "pointer",
  };

  return (
    <Page>
      {/* breadcrumb — Domain (clickable) › Sub-tab (current). No capability dup. */}
      <nav
        aria-label="Breadcrumb"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          fontSize: 12.5,
          color: "var(--cg-text-muted)",
          marginBottom: 14,
        }}
      >
        <button
          type="button"
          style={crumb}
          onClick={() => {
            const first = domain.subtabs[0];
            if (first)
              navigate(
                `/explore/${slugify(domain.label)}/${slugify(first.label)}`,
              );
          }}
        >
          {domain.label}
        </button>
        <span style={{ opacity: 0.6 }}>›</span>
        <span
          aria-current="page"
          style={{ color: "var(--cg-text-primary)", fontWeight: 600 }}
        >
          {subtab.label}
        </span>
      </nav>

      {/* Primary navigation — capability underline tabs */}
      {capTabs}

      {isGraph ? (
        <div
          ref={contentRef}
          style={{
            height: 420,
            borderRadius: 8,
            border: "1px dashed var(--cg-border-card)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--cg-text-muted)",
            fontSize: 13,
          }}
        >
          Security graph canvas
        </div>
      ) : (
        <div ref={contentRef}>
          {/* Secondary navigation — view pills */}
          {viewPills}

          {/* Per-view content — empty for now (skeleton placeholder) */}
          <div
            data-testid="explore-view"
            data-domain={domainId}
            data-subtab={subtabId}
            data-view={viewId}
            aria-busy="true"
            role="status"
            aria-label={`${spec.views[view] ?? ""} — loading`}
            style={{ marginTop: 20 }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[0, 1, 2].map((r) => (
                <div
                  key={r}
                  style={{
                    height: 12,
                    width: ["62%", "44%", "53%"][r],
                    borderRadius: 6,
                    background: "var(--cg-border-card)",
                    opacity: 0.5,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </Page>
  );
}

/* eslint-disable i18next/no-literal-string, no-param-reassign, react/jsx-props-no-spreading */
import React from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router";
import {
  Plus,
  MessageSquare,
  Settings,
  ChevronRight,
  Users,
  UserCheck,
  Bot,
  ShieldCheck,
  SlidersHorizontal,
  ClipboardCheck,
  Server,
  Layers,
  Network,
  AlertTriangle,
  MessagesSquare,
  GitBranch,
  Code2,
  Package,
  Key,
  Globe,
  Database,
  Cloud,
  Sparkles,
  Shield,
  ChevronsUpDown,
  LayoutDashboard,
  Check,
  Search,
  Activity,
  Zap,
  Plug,
  Target,
  Eye,
  Lock,
  FileCode,
  Cpu,
  Radio,
  Sun,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useGitUser } from "#/hooks/query/use-git-user";
import { UserActions } from "./user-actions";
import { SettingsModal } from "#/components/shared/modals/settings/settings-modal";
import { useSettings } from "#/hooks/query/use-settings";
import { ConversationPanel } from "../conversation-panel/conversation-panel";
import { ConversationPanelWrapper } from "../conversation-panel/conversation-panel-wrapper";
import { useLogout } from "#/hooks/mutation/use-logout";
import { useConfig } from "#/hooks/query/use-config";
import { displayErrorToast } from "#/utils/custom-toast-handlers";
import { useTheme } from "#/context/theme-context";
import { useHiddenNav } from "./sidebar-prefs";
// Raw SVG so the wordmark can inherit theme colour and drop its background rect.
import brandMarkSvg from "#/components/admin/pages/inference-defense-console.svg?raw";

// ── Design tokens — CSS variables for light/dark theme support ────────────────
const T = {
  bg: "var(--cg-bg-primary-sidebar)",
  bgHover: "var(--cg-bg-hover)",
  bgActive: "var(--cg-bg-active)",
  badgeBg: "var(--cg-bg-badge)",
  textPrimary: "var(--cg-text-primary)",
  textNav: "var(--cg-text-nav)",
  textMuted: "var(--cg-text-muted)",
  border: "var(--cg-border)",
  accent: "var(--cg-accent)",
  accentPurple: "var(--cg-accent-purple)",
} as const;

// ── Navigation data ────────────────────────────────────────────────────────────

interface SubSubItem {
  label: string;
  /** Stable URL identifier. Seeded from the label, but INDEPENDENT of it
   *  forever after — never regenerate it from a renamed label. */
  slug: string;
}
interface SubTab {
  id: string;
  label: string;
  /** Stable URL identifier — see SubSubItem.slug. */
  slug: string;
  icon: React.ComponentType<{
    size?: number;
    style?: React.CSSProperties;
    className?: string;
  }>;
  items: SubSubItem[];
}
interface Domain {
  id: number;
  label: string;
  /** Stable URL identifier — see SubSubItem.slug. */
  slug: string;
  icon: React.ComponentType<{
    size?: number;
    style?: React.CSSProperties;
    className?: string;
  }>;
  subtabs: SubTab[];
}

// human-readable, URL-safe slug from a label (used for /explore/<domain>/<subtab>/<capability>)
export const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const NAVIGATION: Domain[] = [
  {
    id: 1,
    label: "Discovery & Inventory",
    slug: "discovery-inventory",
    icon: Search,
    subtabs: [
      {
        id: "1.1",
        label: "Cloud Asset Inventory",
        slug: "cloud-asset-inventory",
        icon: Layers,
        items: [
          {
            label: "Multi-cloud resource graph (AWS, Azure, GCP, OCI, Alibaba)",
            slug: "multi-cloud-inventory",
          },
          { label: "Shadow asset detection", slug: "shadow-assets" },
          { label: "Tagging & ownership policy", slug: "tagging-ownership" },
          { label: "Asset change timeline", slug: "change-history" },
          {
            label: "Unmanaged & orphaned resource detection",
            slug: "orphaned-resources",
          },
        ],
      },
      {
        id: "1.2",
        label: "External Attack Surface",
        slug: "external-attack-surface",
        icon: Globe,
        items: [
          {
            label: "Internet-facing asset discovery",
            slug: "internet-facing-assets",
          },
          {
            label: "Exposed ports, services & certificates",
            slug: "exposed-services",
          },
          { label: "Subdomain & DNS enumeration", slug: "dns-subdomains" },
          {
            label: "Unknown / unmanaged asset alerts",
            slug: "unattributed-assets",
          },
          { label: "Attacker-view exposure scoring", slug: "exposure-score" },
        ],
      },
      {
        id: "1.3",
        label: "Risk & Attack Graph",
        slug: "risk-attack-graph",
        icon: GitBranch,
        items: [
          { label: "Attack path visualization", slug: "attack-paths" },
          { label: "Toxic combination detection", slug: "toxic-combinations" },
          { label: "Blast radius analysis", slug: "predicted-blast-radius" },
          {
            label:
              "Business context scoring (criticality, revenue, data sensitivity)",
            slug: "business-criticality",
          },
          {
            label: "Exploitability-weighted risk prioritization",
            slug: "asset-risk-ranking",
          },
        ],
      },
    ],
  },
  {
    id: 2,
    label: "Identity",
    slug: "identity",
    icon: Users,
    subtabs: [
      {
        id: "2.1",
        label: "Human IAM (CIEM)",
        slug: "human-iam-ciem",
        icon: UserCheck,
        items: [
          {
            label: "Role sprawl & over-privilege detection",
            slug: "excessive-permissions",
          },
          { label: "MFA enforcement & gap analysis", slug: "mfa-coverage" },
          {
            label: "PAM & privileged session management",
            slug: "privileged-access-pam",
          },
          {
            label: "JIT access & standing access removal",
            slug: "just-in-time-access",
          },
          {
            label: "Cross-account trust chain analysis",
            slug: "account-trust-chains",
          },
          { label: "Admin account hardening", slug: "admin-hardening" },
        ],
      },
      {
        id: "2.2",
        label: "Non-Human Identity (NHI)",
        slug: "non-human-identity-nhi",
        icon: Bot,
        items: [
          {
            label: "Service account inventory & permissions audit",
            slug: "service-accounts",
          },
          {
            label: "API token & key lifecycle management",
            slug: "api-keys-tokens",
          },
          {
            label: "Workload identities (OIDC, federated, SPIFFE/SPIRE)",
            slug: "workload-identities",
          },
          {
            label: "AI agent identities & permission scoping",
            slug: "ai-agent-identities",
          },
          {
            label: "Credential rotation enforcement",
            slug: "credential-rotation",
          },
        ],
      },
      {
        id: "2.3",
        label: "Identity Risk Graph",
        slug: "identity-risk-graph",
        icon: Network,
        items: [
          {
            label: "Effective permissions graph",
            slug: "effective-permissions",
          },
          {
            label: "Dormant & orphaned identity detection",
            slug: "dormant-identities",
          },
          {
            label: "Identity–resource toxic combinations",
            slug: "identity-toxic-combinations",
          },
          {
            label: "Lateral movement paths from identity",
            slug: "lateral-movement-paths",
          },
          {
            label: "Privilege escalation path analysis",
            slug: "escalation-paths",
          },
        ],
      },
    ],
  },
  {
    id: 3,
    label: "Posture & Governance",
    slug: "posture-governance",
    icon: ShieldCheck,
    subtabs: [
      {
        id: "3.1",
        label: "Cloud Posture (CSPM)",
        slug: "cloud-posture-cspm",
        icon: SlidersHorizontal,
        items: [
          {
            label: "Misconfiguration detection across all cloud services",
            slug: "misconfigurations",
          },
          {
            label: "Drift detection vs IaC baseline",
            slug: "configuration-drift",
          },
          {
            label: "Secure score (per account, per service, per region)",
            slug: "secure-score",
          },
          {
            label: "Auto-remediation & suggested fixes",
            slug: "auto-remediation",
          },
          {
            label: "Multi-cloud policy enforcement",
            slug: "multi-cloud-guardrails",
          },
        ],
      },
      {
        id: "3.2",
        label: "Vulnerability Management",
        slug: "vulnerability-management",
        icon: AlertTriangle,
        items: [
          {
            label: "CVE scanning across workloads, images & OSes",
            slug: "cve-scanning",
          },
          {
            label:
              "Risk-based prioritization (CVSS + exploitability + runtime context)",
            slug: "vulnerability-prioritization",
          },
          {
            label: "Patch tracking & SLA management",
            slug: "patch-management",
          },
          {
            label: "Remediation validation & re-scan",
            slug: "remediation-validation",
          },
          { label: "Zero-day exposure tracking", slug: "zero-day-exposure" },
        ],
      },
      {
        id: "3.3",
        label: "Compliance & Governance",
        slug: "compliance-governance",
        icon: ClipboardCheck,
        items: [
          {
            label: "CIS benchmarks (AWS / GCP / Azure)",
            slug: "cis-benchmarks",
          },
          { label: "NIST 800-53 & CSF", slug: "nist-800-53" },
          { label: "PCI-DSS v4", slug: "pci-dss" },
          { label: "HIPAA", slug: "hipaa" },
          { label: "SOC 2 Type II", slug: "soc-2" },
          { label: "ISO 27001", slug: "iso-27001" },
          { label: "GDPR & regional frameworks", slug: "gdpr" },
          {
            label: "Continuous evidence collection",
            slug: "continuous-evidence",
          },
          { label: "Audit-ready reporting & export", slug: "auditor-exports" },
        ],
      },
    ],
  },
  {
    id: 4,
    label: "Code-to-Cloud",
    slug: "code-to-cloud",
    icon: Code2,
    subtabs: [
      {
        id: "4.1",
        label: "IaC & DevSecOps",
        slug: "iac-devsecops",
        icon: FileCode,
        items: [
          {
            label: "Terraform scanning (pre-deploy, OPA / Sentinel gates)",
            slug: "terraform",
          },
          {
            label: "CloudFormation / ARM / Bicep analysis",
            slug: "cloudformation-arm",
          },
          {
            label: "Helm & Kubernetes manifest scanning",
            slug: "kubernetes-manifests",
          },
          {
            label: "CI/CD pipeline gates & break-the-build",
            slug: "ci-cd-gates",
          },
          { label: "Policy-as-code enforcement", slug: "policy-as-code" },
          { label: "IaC-to-runtime drift detection", slug: "iac-drift" },
        ],
      },
      {
        id: "4.2",
        label: "App Security Posture (ASPM)",
        slug: "app-security-posture-aspm",
        icon: Eye,
        items: [
          {
            label: "Application inventory & ownership mapping",
            slug: "application-inventory",
          },
          { label: "Code-level vulnerability context", slug: "sast" },
          { label: "SCA — open source risk in application layer", slug: "sca" },
          {
            label: "Developer-facing findings & IDE integration",
            slug: "ide-integration",
          },
          {
            label: "App risk score correlated to infrastructure context",
            slug: "application-risk-score",
          },
          {
            label:
              "Reachability analysis (is the vulnerability actually exploitable)",
            slug: "reachability",
          },
        ],
      },
      {
        id: "4.3",
        label: "Supply Chain & SBOM",
        slug: "supply-chain-sbom",
        icon: Package,
        items: [
          {
            label: "Dependency scanning (direct + transitive)",
            slug: "dependency-risk",
          },
          {
            label: "SBOM generation (CycloneDX / SPDX)",
            slug: "sbom-generation",
          },
          { label: "VEX statements & vulnerability exceptions", slug: "vex" },
          {
            label: "Artifact signing — SLSA L1 / L2 / L3",
            slug: "artifact-signing-slsa",
          },
          {
            label: "Provenance & Sigstore transparency log",
            slug: "build-provenance",
          },
          { label: "Malicious package detection", slug: "malicious-packages" },
        ],
      },
      {
        id: "4.4",
        label: "Secrets Detection",
        slug: "secrets-detection",
        icon: Key,
        items: [
          {
            label: "Git history & PR diff scanning",
            slug: "repository-scanning",
          },
          {
            label: "Pre-commit hooks & branch scanning",
            slug: "pre-commit-hooks",
          },
          {
            label: "CI/CD variable & pipeline secret exposure",
            slug: "ci-cd-secrets",
          },
          {
            label: "Config maps & env file scanning",
            slug: "config-env-files",
          },
          {
            label: "Cloud-native secret store adoption tracking",
            slug: "secret-managers",
          },
          {
            label: "Verified vs unverified secret triage",
            slug: "secret-validation",
          },
        ],
      },
    ],
  },
  {
    id: 5,
    label: "API Security",
    slug: "api-security",
    icon: Globe,
    subtabs: [
      {
        id: "5.1",
        label: "API Discovery & Inventory",
        slug: "api-discovery-inventory",
        icon: Search,
        items: [
          {
            label:
              "Automatic API endpoint discovery (agentless + traffic-based)",
            slug: "endpoint-discovery",
          },
          {
            label:
              "Shadow API detection (undocumented, unregistered endpoints)",
            slug: "shadow-apis",
          },
          {
            label: "Zombie API detection (deprecated but still active)",
            slug: "zombie-apis",
          },
          {
            label: "Internal vs external API classification",
            slug: "api-classification",
          },
          { label: "API ownership & team mapping", slug: "api-ownership" },
          {
            label: "OpenAPI / GraphQL / gRPC schema registry",
            slug: "schema-registry",
          },
        ],
      },
      {
        id: "5.2",
        label: "API Posture & Design Risk",
        slug: "api-posture-design-risk",
        icon: Lock,
        items: [
          {
            label: "OpenAPI spec drift (schema vs actual traffic)",
            slug: "spec-drift",
          },
          {
            label: "Authentication & authorization schema review",
            slug: "authn-authz",
          },
          {
            label:
              "Insecure defaults (verbose errors, no rate limits, open CORS)",
            slug: "insecure-defaults",
          },
          {
            label: "mTLS & transport security enforcement",
            slug: "transport-security-mtls",
          },
          {
            label: "API versioning risk (old versions still reachable)",
            slug: "deprecated-versions",
          },
          {
            label: "GraphQL introspection & depth limit exposure",
            slug: "graphql-exposure",
          },
        ],
      },
      {
        id: "5.3",
        label: "OWASP API Top 10",
        slug: "owasp-api-top-10",
        icon: Shield,
        items: [
          {
            label: "API1 — Broken object level authorization (BOLA)",
            slug: "api1-bola",
          },
          { label: "API2 — Broken authentication", slug: "api2-broken-auth" },
          {
            label: "API3 — Broken object property level authorization",
            slug: "api3-bopla",
          },
          {
            label: "API4 — Unrestricted resource consumption",
            slug: "api4-resource-consumption",
          },
          {
            label: "API5 — Broken function level authorization (BFLA)",
            slug: "api5-bfla",
          },
          {
            label: "API6 — Unrestricted access to sensitive business flows",
            slug: "api6-business-flows",
          },
          {
            label: "API7 — Server-side request forgery (SSRF)",
            slug: "api7-ssrf",
          },
          {
            label: "API8 — Security misconfiguration",
            slug: "api8-misconfiguration",
          },
          {
            label: "API9 — Improper inventory management",
            slug: "api9-inventory",
          },
          {
            label: "API10 — Unsafe consumption of APIs",
            slug: "api10-unsafe-consumption",
          },
        ],
      },
      {
        id: "5.4",
        label: "API Runtime & Traffic Analysis",
        slug: "api-runtime-traffic-analysis",
        icon: Activity,
        items: [
          { label: "L7 real-time traffic inspection", slug: "l7-inspection" },
          {
            label: "Anomalous request pattern detection",
            slug: "request-anomalies",
          },
          {
            label: "Rate limit enforcement & abuse detection",
            slug: "rate-limit-abuse",
          },
          {
            label: "Bot vs human traffic classification",
            slug: "bot-detection",
          },
          {
            label: "Credential stuffing & brute force on API endpoints",
            slug: "credential-stuffing",
          },
          {
            label: "Data exfiltration via API response analysis",
            slug: "response-exfiltration",
          },
        ],
      },
      {
        id: "5.5",
        label: "API Threat Detection",
        slug: "api-threat-detection",
        icon: AlertTriangle,
        items: [
          {
            label:
              "API-specific attack signatures (injection, fuzzing, scraping)",
            slug: "attack-signatures",
          },
          {
            label: "Behavioral baseline per endpoint",
            slug: "endpoint-baselines",
          },
          {
            label: "Sequence anomaly (abnormal call chains)",
            slug: "call-chain-anomalies",
          },
          { label: "Privilege escalation via API", slug: "api-escalation" },
          {
            label: "Lateral movement through internal APIs",
            slug: "api-lateral-movement",
          },
          {
            label: "Alert correlation with CDR & identity layer",
            slug: "cross-layer-correlation",
          },
        ],
      },
      {
        id: "5.6",
        label: "API Governance & Compliance",
        slug: "api-governance-compliance",
        icon: ClipboardCheck,
        items: [
          {
            label: "API catalog & lifecycle management",
            slug: "api-lifecycle",
          },
          {
            label: "Deprecation & sunset policy enforcement",
            slug: "deprecation-sunset",
          },
          {
            label: "Sensitive data in API responses (PII, tokens, secrets)",
            slug: "pii-in-responses",
          },
          {
            label: "Regulatory mapping (GDPR, PCI-DSS, HIPAA)",
            slug: "regulatory-mapping",
          },
          {
            label: "Consumer access audit (who calls what, how often)",
            slug: "consumer-audit",
          },
          { label: "API SLA & uptime risk scoring", slug: "api-sla-risk" },
        ],
      },
    ],
  },
  {
    id: 6,
    label: "Workload & Runtime",
    slug: "workload-runtime",
    icon: Server,
    subtabs: [
      {
        id: "6.1",
        label: "Workload Protection (CWPP)",
        slug: "workload-protection-cwpp",
        icon: Shield,
        items: [
          {
            label: "VM vulnerability scanning & patching",
            slug: "vm-vulnerabilities",
          },
          {
            label: "Serverless function security (Lambda, Cloud Functions)",
            slug: "serverless-security",
          },
          {
            label: "Runtime anomaly detection (process, file, syscall)",
            slug: "runtime-threats",
          },
          {
            label: "Malware detection & quarantine",
            slug: "malware-detection",
          },
          {
            label: "File integrity monitoring (FIM)",
            slug: "file-integrity-fim",
          },
          {
            label: "eBPF-based kernel-level visibility",
            slug: "kernel-visibility-ebpf",
          },
        ],
      },
      {
        id: "6.2",
        label: "Containers & Kubernetes (KSPM)",
        slug: "containers-kubernetes-kspm",
        icon: Layers,
        items: [
          {
            label: "Cluster posture (kube-bench, CIS K8s benchmarks)",
            slug: "cluster-posture",
          },
          { label: "RBAC analysis & violations", slug: "kubernetes-rbac" },
          {
            label: "Container image scanning (CVE, malware, embedded secrets)",
            slug: "container-images",
          },
          {
            label: "Registry security & image signing (Cosign)",
            slug: "registry-image-signing",
          },
          {
            label: "Runtime container defense & drift detection",
            slug: "container-runtime",
          },
          {
            label: "Admission controller policy enforcement",
            slug: "admission-control",
          },
        ],
      },
      {
        id: "6.3",
        label: "Network Security",
        slug: "network-security",
        icon: Network,
        items: [
          {
            label: "VPC & security group analysis",
            slug: "vpc-security-groups",
          },
          { label: "NACL & firewall rule audit", slug: "firewall-rules" },
          {
            label: "Flow log ingestion & anomaly detection",
            slug: "flow-log-analysis",
          },
          {
            label: "DDoS & WAF coverage assessment",
            slug: "ddos-waf-coverage",
          },
          {
            label: "East-west micro-segmentation enforcement",
            slug: "micro-segmentation",
          },
          { label: "Zero trust network policy gaps", slug: "zero-trust-gaps" },
        ],
      },
      {
        id: "6.4",
        label: "Serverless & PaaS",
        slug: "serverless-paas",
        icon: Server,
        items: [
          {
            label:
              "Managed service misconfiguration (RDS, managed K8s, queues)",
            slug: "managed-service-config",
          },
          {
            label: "Event-driven attack surface (triggers, event buses)",
            slug: "event-trigger-surface",
          },
          {
            label: "Privilege escalation via serverless triggers",
            slug: "trigger-escalation",
          },
          {
            label: "Cold-start & ephemeral workload blind spots",
            slug: "cold-start-blind-spots",
          },
          {
            label: "Function-to-function permission sprawl",
            slug: "function-permissions",
          },
        ],
      },
    ],
  },
  {
    id: 7,
    label: "Data & SaaS",
    slug: "data-saas",
    icon: Database,
    subtabs: [
      {
        id: "7.1",
        label: "Data Security (DSPM)",
        slug: "data-security-dspm",
        icon: Database,
        items: [
          {
            label:
              "Data store discovery & classification (S3, RDS, BigQuery, Blob, Snowflake)",
            slug: "data-store-discovery",
          },
          {
            label: "PII / PCI / PHI / PHD sensitive data detection",
            slug: "sensitive-data-discovery",
          },
          {
            label: "Encryption coverage (at-rest & in-transit)",
            slug: "encryption-coverage",
          },
          {
            label: "Excess data access (who can reach what data)",
            slug: "excessive-data-access",
          },
          {
            label: "Data flow mapping (how data moves between services)",
            slug: "data-flow-mapping",
          },
          {
            label: "DLP policy enforcement & violation alerting",
            slug: "dlp-policies",
          },
          {
            label: "Data residency & sovereignty compliance",
            slug: "data-residency",
          },
        ],
      },
      {
        id: "7.2",
        label: "SaaS Security (SSPM)",
        slug: "saas-security-sspm",
        icon: Cloud,
        items: [
          {
            label: "M365 tenant config, sharing & guest access",
            slug: "microsoft-365",
          },
          {
            label: "Google Workspace DLP & guest policies",
            slug: "google-workspace",
          },
          {
            label: "Salesforce org permissions & IP restrictions",
            slug: "salesforce",
          },
          { label: "GitHub org security & branch protection", slug: "github" },
          { label: "Slack & collaboration tool posture", slug: "slack" },
          {
            label: "OAuth app inventory, scope audit & risk scoring",
            slug: "oauth-app-risk",
          },
          {
            label: "Shadow SaaS detection & unmanaged app access",
            slug: "shadow-saas",
          },
        ],
      },
    ],
  },
  {
    id: 8,
    label: "Detection & Response",
    slug: "detection-response",
    icon: AlertTriangle,
    subtabs: [
      {
        id: "8.1",
        label: "Cloud Detection (CDR)",
        slug: "cloud-detection-cdr",
        icon: Activity,
        items: [
          {
            label:
              "Real-time log ingestion & normalization (CloudTrail, Azure Monitor, GCP)",
            slug: "telemetry-ingestion",
          },
          {
            label: "SIEM-style correlation across cloud telemetry",
            slug: "detection-correlation",
          },
          { label: "Behavioral anomaly detection (UEBA)", slug: "ueba" },
          {
            label: "Lateral movement & pivot detection",
            slug: "lateral-movement-detections",
          },
          {
            label: "Privilege escalation detection",
            slug: "escalation-detections",
          },
          {
            label: "API abuse & credential stuffing signals",
            slug: "api-abuse",
          },
          {
            label: "Multi-cloud alert deduplication & normalization",
            slug: "alert-normalization",
          },
        ],
      },
      {
        id: "8.2",
        label: "Threat Intelligence",
        slug: "threat-intelligence",
        icon: Radio,
        items: [
          {
            label: "IOC & IOA feed ingestion (commercial + open source)",
            slug: "ioc-ioa-feeds",
          },
          {
            label: "MITRE ATT&CK cloud matrix coverage mapping",
            slug: "mitre-att-ck-mapping",
          },
          {
            label: "Adversary campaign & TTP tracking",
            slug: "campaigns-ttps",
          },
          {
            label: "Threat actor attribution & profiling",
            slug: "threat-actors",
          },
          {
            label: "Intelligence-enriched alert context",
            slug: "alert-enrichment",
          },
          {
            label: "Cloud provider CVE & advisory watch",
            slug: "provider-advisories",
          },
        ],
      },
      {
        id: "8.3",
        label: "Incident Response",
        slug: "incident-response",
        icon: Zap,
        items: [
          { label: "Alert triage & case management", slug: "case-management" },
          { label: "SOAR playbook automation", slug: "response-playbooks" },
          {
            label:
              "Automated containment (isolate, credential revoke, quarantine)",
            slug: "auto-containment",
          },
          {
            label: "Forensic timeline & evidence collection",
            slug: "forensic-evidence",
          },
          {
            label: "Post-incident blast radius assessment",
            slug: "incident-blast-radius",
          },
          { label: "MTTR tracking & SLA reporting", slug: "mttr-sla" },
          {
            label: "Runbook library & response templates",
            slug: "runbook-library",
          },
        ],
      },
      {
        id: "8.4",
        label: "SOC Integrations",
        slug: "soc-integrations",
        icon: Plug,
        items: [
          {
            label:
              "SIEM forwarding (Splunk, Microsoft Sentinel, Chronicle, QRadar)",
            slug: "siem-forwarding",
          },
          {
            label: "Ticketing (Jira, ServiceNow, PagerDuty, Linear)",
            slug: "ticketing-itsm",
          },
          {
            label:
              "EDR / XDR bidirectional telemetry (CrowdStrike, SentinelOne, Defender)",
            slug: "edr-xdr",
          },
          { label: "Chat ops (Slack, Teams)", slug: "chatops" },
          { label: "Webhook & REST API automation", slug: "webhooks-rest-api" },
          {
            label: "SOAR connectors (Palo Alto XSOAR, Swimlane, Tines)",
            slug: "soar-connectors",
          },
        ],
      },
    ],
  },
  {
    id: 9,
    label: "AI & Emerging Threats",
    slug: "ai-emerging-threats",
    icon: Sparkles,
    subtabs: [
      {
        id: "9.1",
        label: "AI Security Posture (AI-SPM)",
        slug: "ai-security-posture-ai-spm",
        icon: Sparkles,
        items: [
          { label: "AI workload & model inventory", slug: "model-inventory" },
          {
            label: "Training infrastructure misconfiguration",
            slug: "training-infrastructure",
          },
          {
            label: "Model access controls & least privilege",
            slug: "model-access-control",
          },
          {
            label: "AI BOM (model cards, weights, training data lineage)",
            slug: "ai-bom",
          },
          {
            label: "Shadow AI & unregistered model detection",
            slug: "shadow-ai",
          },
        ],
      },
      {
        id: "9.2",
        label: "LLM / GenAI Attack Surface",
        slug: "llm-genai-attack-surface",
        icon: Bot,
        items: [
          {
            label: "Prompt injection detection & input filtering",
            slug: "prompt-injection",
          },
          {
            label: "Sensitive data leakage from LLM outputs",
            slug: "output-data-leakage",
          },
          { label: "Model theft & extraction risk", slug: "model-extraction" },
          {
            label: "Insecure plugin / tool / MCP integrations",
            slug: "plugin-mcp-risk",
          },
          {
            label: "LLM endpoint inventory & public exposure",
            slug: "llm-endpoint-exposure",
          },
          {
            label: "Jailbreak & policy bypass detection",
            slug: "jailbreak-bypass",
          },
        ],
      },
      {
        id: "9.3",
        label: "AI Agent Identity & Governance",
        slug: "ai-agent-identity-governance",
        icon: Cpu,
        items: [
          {
            label: "Agent permission scoping & least privilege",
            slug: "agent-permission-scope",
          },
          {
            label: "Agent action audit logs & observability",
            slug: "agent-action-logs",
          },
          {
            label: "Agentic workflow blast radius mapping",
            slug: "agent-blast-radius",
          },
          {
            label: "Multi-agent trust chain analysis",
            slug: "agent-trust-chains",
          },
          {
            label: "Runtime agent behavioral monitoring & anomaly detection",
            slug: "agent-behavior-monitoring",
          },
          {
            label: "Human-in-the-loop enforcement policy",
            slug: "human-in-the-loop",
          },
        ],
      },
      {
        id: "9.4",
        label: "Emerging Threat Simulation (CTEM)",
        slug: "emerging-threat-simulation-ctem",
        icon: Target,
        items: [
          {
            label: "Zero-day cloud service vulnerability watch",
            slug: "emerging-cve-watch",
          },
          {
            label: "Continuous threat exposure management cycles",
            slug: "ctem-cycles",
          },
          {
            label: "Adversarial ML & model poisoning tracking",
            slug: "adversarial-ml",
          },
          {
            label: "New attack technique simulation & purple teaming",
            slug: "attack-simulation-bas",
          },
          {
            label:
              "Exposure validation (confirm if attack paths are exploitable)",
            slug: "exposure-validation",
          },
        ],
      },
    ],
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function hoverOn(el: HTMLElement) {
  el.style.background = T.bgHover;
}
function hoverOff(el: HTMLElement, active: boolean) {
  el.style.background = active ? T.bgActive : "transparent";
}

// ── Main sidebar ───────────────────────────────────────────────────────────────
export function Sidebar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const user = useGitUser();
  const { data: config } = useConfig();
  const {
    data: settings,
    error: settingsError,
    isError: settingsIsError,
    isFetching: isFetchingSettings,
  } = useSettings();
  const { mutate: logout } = useLogout();

  const { theme, toggle: toggleTheme } = useTheme();
  const hiddenNav = useHiddenNav();
  const [settingsModalIsOpen, setSettingsModalIsOpen] = React.useState(false);
  const [conversationPanelIsOpen, setConversationPanelIsOpen] =
    React.useState(false);
  const [expandedDomain, setExpandedDomain] = React.useState<number | null>(
    null,
  );
  const [workspaceOpen, setWorkspaceOpen] = React.useState(false);
  const workspaceRef = React.useRef<HTMLDivElement>(null);

  // ── Collapse state ───────────────────────────────────────────────────────────
  // `pinnedOpen` is the PERSISTED user preference; `collapsed` below is the
  // derived VISUAL state (pinned OR hovered). Everything that renders reads
  // `collapsed`, so the split is invisible to the rest of this component.
  // Default is collapsed: the rail is the resting state, hover reveals.
  const [pinnedOpen, setPinnedOpen] = React.useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("cg.sidebar.collapsed") === "0";
  });
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        "cg.sidebar.collapsed",
        pinnedOpen ? "0" : "1",
      );
    }
  }, [pinnedOpen]);
  const toggleCollapsed = () => setPinnedOpen((p) => !p);

  // Overlay + hover-to-open apply on desktop only. Below `md` the root layout
  // stacks vertically and the sidebar is a top bar, where an absolutely
  // positioned overlay would break the page.
  const [isDesktop, setIsDesktop] = React.useState<boolean>(() =>
    typeof window === "undefined"
      ? true
      : window.matchMedia("(min-width: 768px)").matches,
  );
  React.useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const onChange = () => setIsDesktop(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Hover intent: a short open delay so crossing the rail on the way elsewhere
  // does not flash it open, and a longer close delay so a small wobble (or a
  // trip out to a submenu) does not snap it shut mid-reach.
  const [hovered, setHovered] = React.useState(false);
  const hoverTimer = React.useRef<number | null>(null);
  const scheduleHover = React.useCallback((next: boolean) => {
    if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(
      () => setHovered(next),
      next ? 60 : 180,
    );
  }, []);
  React.useEffect(
    () => () => {
      if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
    },
    [],
  );

  const collapsed = isDesktop ? !(pinnedOpen || hovered) : !pinnedOpen;
  // Desktop reserves the rail regardless of expansion (the panel overlays);
  // mobile still reflows, so its wrapper follows the visual state.
  const railOnly = isDesktop || collapsed;
  // The workspace dropdown is rendered INSIDE the sidebar and is not portaled,
  // so collapsing while it is open would tear it away mid-interaction.
  const holdOpen = workspaceOpen;
  // Collapsed → narrow icon-rail (not zero) so icons + tooltips remain reachable.
  // Widths come from the sidebar token set in index.css (Cloudflare metrics).
  const RAIL_WIDTH = "var(--sidebar-width-icon)"; // 57px
  const FULL_WIDTH = "var(--sidebar-width)"; // 16.25rem / 260px
  // Label/chevron fade: on collapse fade ahead of width; on re-open delay 50ms
  // so labels only appear after the panel has space.
  const labelOpacityTransition = collapsed
    ? "opacity 100ms ease-out"
    : "opacity 150ms ease-out 50ms";

  // ── Custom rail tooltip (fixed-positioned so it escapes the wrapper's
  //    overflow-x:clip and renders without browser title-attribute delay) ──
  const [tooltip, setTooltip] = React.useState<{
    label: string;
    top: number;
    left: number;
  } | null>(null);
  const railHover = (label: string, isActive: boolean = false) => ({
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
      if (collapsed) {
        const r = e.currentTarget.getBoundingClientRect();
        setTooltip({ label, top: r.top + r.height / 2, left: r.right + 8 });
      }
      if (!isActive) hoverOn(e.currentTarget as HTMLElement);
    },
    onMouseLeave: (e: React.MouseEvent<HTMLElement>) => {
      setTooltip(null);
      hoverOff(e.currentTarget as HTMLElement, isActive);
    },
  });
  // Hide tooltip whenever we collapse/expand to avoid stale floating chip
  React.useEffect(() => {
    setTooltip(null);
  }, [collapsed]);
  // Click handler for domain icons in collapsed mode: expand the rail and
  // open that domain, rather than trying to render subtabs in 56px of space.
  const handleDomainClick = (id: number) => {
    if (collapsed) {
      // Clicking from the rail is an intentional commit — pin it open rather
      // than leaving it dependent on the pointer staying put.
      setPinnedOpen(true);
      setExpandedDomain(id);
      return;
    }
    setExpandedDomain((prev) => (prev === id ? null : id));
  };

  const shouldHideLlmSettings =
    config?.FEATURE_FLAGS.HIDE_LLM_SETTINGS && config?.APP_MODE === "saas";

  React.useEffect(() => {
    if (shouldHideLlmSettings) return;
    if (pathname === "/settings") {
      setSettingsModalIsOpen(false);
    } else if (
      !isFetchingSettings &&
      settingsIsError &&
      settingsError?.status !== 404
    ) {
      displayErrorToast(
        "Something went wrong while fetching settings. Please reload the page.",
      );
    } else if (config?.APP_MODE === "oss" && settingsError?.status === 404) {
      setSettingsModalIsOpen(true);
    }
  }, [settingsError?.status, settingsError, isFetchingSettings, pathname]);

  React.useEffect(() => {
    if (!workspaceOpen) return undefined;
    const handler = (e: MouseEvent) => {
      if (
        workspaceRef.current &&
        !workspaceRef.current.contains(e.target as Node)
      ) {
        setWorkspaceOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [workspaceOpen]);

  // A sub-tab now routes to its explore view; its third-level items render as a
  // pill view-navigation in the MAIN content area (admin /admin/identity style).
  const subtabPath = (d: Domain, s: SubTab) => `/explore/${d.slug}/${s.slug}`;

  return (
    <>
      {/* ── Primary sidebar — collapsible wrapper ────────────────────────── */}
      <div
        data-cg-sidebar-wrapper
        data-collapsed={collapsed ? "true" : "false"}
        onMouseEnter={isDesktop ? () => scheduleHover(true) : undefined}
        onMouseLeave={
          isDesktop
            ? () => {
                if (!holdOpen) scheduleHover(false);
              }
            : undefined
        }
        style={{
          // On desktop the wrapper ALWAYS reserves just the rail, so expanding
          // never reflows the page — the panel floats above it instead.
          width: railOnly ? RAIL_WIDTH : FULL_WIDTH,
          // Must not clip: the expanded panel is wider than this wrapper.
          overflow: "visible",
          height: "100%",
          flexShrink: 0,
          position: "relative",
          zIndex: 60,
          transition: isDesktop ? undefined : "width 150ms ease-out",
        }}
        className="lg:sticky lg:top-0"
      >
        <aside
          style={{
            width: collapsed ? RAIL_WIDTH : FULL_WIDTH,
            minWidth: collapsed ? RAIL_WIDTH : FULL_WIDTH,
            background: T.bg,
            borderRight: `1px solid ${T.border}`,
            height: "100%",
            overflow: "visible",
            fontFamily: "system-ui, -apple-system, sans-serif",
            flexShrink: 0,
            // Absolute on desktop so the expanded panel paints OVER the main
            // view instead of taking space from it.
            position: isDesktop ? "absolute" : "relative",
            top: isDesktop ? 0 : undefined,
            left: isDesktop ? 0 : undefined,
            zIndex: isDesktop ? 60 : undefined,
            boxShadow:
              isDesktop && !collapsed
                ? "0 10px 40px rgba(0, 0, 0, 0.38)"
                : "none",
            // One duration + easing for every animated property, so width,
            // padding, rows and transforms read as a single gesture.
            transition:
              "width var(--sidebar-animation-duration) var(--sidebar-easing), min-width var(--sidebar-animation-duration) var(--sidebar-easing), box-shadow var(--sidebar-animation-duration) var(--sidebar-easing), background-color 35ms ease-out, border-color 35ms ease-out",
          }}
          className="flex flex-col"
        >
          {/* Brand — when expanded: logo + title + toggle on the RIGHT.
                     when collapsed: only the open-toggle, sitting at top. */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              // Collapsed the wordmark is gone, so the toggle is the ONLY child:
              // centre it in the rail instead of leaving it pinned to the left
              // gutter, where it sat off the icons' centre line below.
              justifyContent: collapsed ? "center" : "flex-start",
              gap: 10,
              height: 50, // align this separator with the top bar's (both 50px)
              boxSizing: "border-box",
              padding: collapsed ? "0" : "0 12px",
              borderBottom: `1px solid ${T.border}`,
              flexShrink: 0,
              transition:
                "padding var(--sidebar-animation-duration) var(--sidebar-easing)",
            }}
          >
            {/* App wordmark — the same asset used as the graph-canvas
                watermark, so brand is expressed once. Inlined (not <img>) for
                two reasons: the file carries an opaque light background rect
                that would show as a white block on the dark rail, and inlining
                lets the glyphs inherit the theme colour. It fades and slides
                out as the rail collapses rather than disappearing abruptly. */}
            <span
              className="cg-sb-brand"
              data-hidden={collapsed ? "true" : "false"}
              aria-label="Inference Defense"
              role="img"
              // eslint-disable-next-line react/no-danger
              dangerouslySetInnerHTML={{ __html: brandMarkSvg }}
            />
            <button
              type="button"
              // Reflects the PINNED preference, not the transient hover state —
              // otherwise the control would appear to toggle itself as the
              // pointer crosses the sidebar.
              aria-pressed={pinnedOpen}
              aria-label={pinnedOpen ? "Unpin sidebar" : "Pin sidebar open"}
              onClick={toggleCollapsed}
              style={{
                marginLeft: collapsed ? 0 : "auto",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: 6,
                borderRadius: 6,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: T.textMuted,
                transition:
                  "background-color 35ms ease-out, color 35ms ease-out",
                flexShrink: 0,
              }}
              {...railHover(pinnedOpen ? "Unpin sidebar" : "Pin sidebar open")}
            >
              {/* Keyed on the PINNED state, not the derived `collapsed` one.
                  Hovering already expands the sidebar, so `collapsed` is
                  false before the click — the icon never changed and the
                  control looked inert. `pinnedOpen` is what the click flips. */}
              {pinnedOpen ? (
                <PanelLeftClose size={16} />
              ) : (
                <PanelLeftOpen size={16} />
              )}
            </button>
          </div>

          {/* Workspace selector — collapsed: reserve the same vertical space so
            nav icons below do not shift upward. */}
          {collapsed ? (
            <div aria-hidden="true" style={{ height: 50, flexShrink: 0 }} />
          ) : (
            <div
              style={{ padding: "10px 10px 6px", position: "relative" }}
              ref={workspaceRef}
            >
              <button
                type="button"
                onClick={() => setWorkspaceOpen((p) => !p)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  width: "100%",
                  padding: "7px 10px",
                  background: workspaceOpen
                    ? "var(--cg-workspace-bg-hover)"
                    : "var(--cg-workspace-bg)",
                  border: `1px solid ${T.border}`,
                  borderRadius: 8,
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "background 0.12s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "var(--cg-workspace-bg-hover)";
                }}
                onMouseLeave={(e) => {
                  if (!workspaceOpen)
                    (e.currentTarget as HTMLButtonElement).style.background =
                      "var(--cg-workspace-bg)";
                }}
              >
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 5,
                    background: "var(--cg-accent-purple-bg)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <ShieldCheck size={11} style={{ color: T.accentPurple }} />
                </div>
                <span
                  style={{
                    flex: 1,
                    fontSize: 13,
                    fontWeight: 500,
                    color: T.textPrimary,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  Default
                </span>
                <ChevronsUpDown
                  size={13}
                  style={{ color: T.textMuted, flexShrink: 0 }}
                />
              </button>

              {workspaceOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% - 2px)",
                    left: 10,
                    right: 10,
                    background: "var(--cg-workspace-dropdown-bg)",
                    border: `1px solid ${T.border}`,
                    borderRadius: 10,
                    zIndex: 9999,
                    overflow: "hidden",
                    boxShadow: "var(--cg-shadow-dropdown)",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setWorkspaceOpen(false)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      width: "100%",
                      padding: "9px 12px",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "background 0.12s",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background =
                        T.bgHover;
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background =
                        "transparent";
                    }}
                  >
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 5,
                        background: "var(--cg-accent-purple-bg)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <ShieldCheck
                        size={11}
                        style={{ color: T.accentPurple }}
                      />
                    </div>
                    <span
                      style={{
                        flex: 1,
                        fontSize: 13,
                        fontWeight: 500,
                        color: T.textPrimary,
                      }}
                    >
                      Default
                    </span>
                    <Check
                      size={13}
                      style={{ color: T.accentPurple, flexShrink: 0 }}
                    />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Scrollable nav */}
          <nav
            style={{
              flex: 1,
              overflowY: "auto",
              overflowX: "hidden",
              transition:
                "background-color 35ms ease-out, border-color 35ms ease-out, box-shadow 35ms ease-out",
            }}
            className="cg-sidebar-nav"
          >
            {/* Top actions */}
            <div style={{ padding: "4px 0" }}>
              {/* New Conversation */}
              <button
                type="button"
                aria-label="New Conversation"
                onClick={() => navigate("/")}
                className="cg-sb-item"
                data-active={pathname === "/" ? "true" : "false"}
                {...railHover("New Conversation", pathname === "/")}
              >
                <span
                  style={{
                    color: T.textPrimary,
                    display: "flex",
                    flexShrink: 0,
                  }}
                >
                  <Plus size={15} />
                </span>
                {!collapsed && (
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 400,
                      color: T.textPrimary,
                      opacity: 1,
                      transition: labelOpacityTransition,
                      whiteSpace: "nowrap",
                    }}
                  >
                    New Conversation
                  </span>
                )}
              </button>

              {/* Conversations */}
              <button
                type="button"
                aria-label="Conversations"
                onClick={() =>
                  settings?.EMAIL_VERIFIED === false
                    ? undefined
                    : setConversationPanelIsOpen((p) => !p)
                }
                className="cg-sb-item"
                data-active={conversationPanelIsOpen ? "true" : "false"}
                {...railHover("Conversations", conversationPanelIsOpen)}
              >
                <span
                  style={{
                    color: T.textPrimary,
                    display: "flex",
                    flexShrink: 0,
                  }}
                >
                  <MessageSquare size={15} />
                </span>
                {!collapsed && (
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 400,
                      color: T.textPrimary,
                      opacity: 1,
                      transition: labelOpacityTransition,
                      whiteSpace: "nowrap",
                    }}
                  >
                    Conversations
                  </span>
                )}
              </button>
            </div>
            {/* Divider */}
            <div
              style={{ height: 1, background: T.border, margin: "4px 0 6px" }}
            />
            {/* GLOBAL zone caption */}
            {!collapsed && (
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  color: T.textMuted,
                  textTransform: "uppercase",
                  padding: "8px 14px 4px",
                }}
              >
                Global
              </div>
            )}
            {/* Dashboard */}
            {!hiddenNav.has("global:Dashboard") && (
              <button
                type="button"
                aria-label="Dashboard"
                onClick={() => navigate("/")}
                className="cg-sb-item"
                {...railHover("Dashboard")}
              >
                <LayoutDashboard
                  size={15}
                  style={{ color: T.textPrimary, flexShrink: 0 }}
                />
                {!collapsed && (
                  <>
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 400,
                        color: T.textPrimary,
                        flex: 1,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        opacity: 1,
                        transition: labelOpacityTransition,
                      }}
                    >
                      Dashboard
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        color: T.textMuted,
                        fontWeight: 600,
                        letterSpacing: "0.02em",
                        marginLeft: 2,
                      }}
                    >
                      0
                    </span>
                  </>
                )}
              </button>
            )}
            {/* Security graph · Issues · Findings (global, with severity badges) */}
            {(
              [
                /* `prefKey` is the ORIGINAL label: hidden-nav preferences are persisted as `global:<label>`, so renaming the display text alone would resurrect items the operator had hidden. */ {
                  label: "Global Security Graph",
                  prefKey: "Security graph",
                  to: "/security-graph",
                  Icon: Network,
                },
                {
                  label: "Communication",
                  to: "/communication",
                  Icon: MessagesSquare,
                },
                {
                  label: "All Findings",
                  prefKey: "Findings",
                  to: "/findings",
                  Icon: Eye,
                  badge: "148",
                },
              ] as {
                label: string;
                prefKey?: string;
                to: string;
                Icon: typeof Network;
                badge?: string;
                badgeColor?: string;
              }[]
            )
              .filter((g) => !hiddenNav.has(`global:${g.prefKey ?? g.label}`))
              .map((g) => {
                const active =
                  pathname === g.to || pathname.startsWith(`${g.to}/`);
                return (
                  <button
                    key={g.to}
                    type="button"
                    aria-label={g.label}
                    onClick={() => navigate(g.to)}
                    className="cg-sb-item"
                    data-active={active ? "true" : "false"}
                    {...railHover(g.label, active)}
                  >
                    <g.Icon
                      size={15}
                      style={{ color: T.textPrimary, flexShrink: 0 }}
                    />
                    {!collapsed && (
                      <>
                        <span
                          style={{
                            fontSize: 14,
                            fontWeight: 400,
                            color: T.textPrimary,
                            flex: 1,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            transition: labelOpacityTransition,
                          }}
                        >
                          {g.label}
                        </span>
                        {g.badge && (
                          <span
                            style={{
                              fontSize: 10.5,
                              fontWeight: 700,
                              color: g.badgeColor ? "#fff" : T.textMuted,
                              background: g.badgeColor ?? "transparent",
                              borderRadius: 9,
                              padding: g.badgeColor ? "1px 7px" : "0",
                              letterSpacing: "0.02em",
                            }}
                          >
                            {g.badge}
                          </span>
                        )}
                      </>
                    )}
                  </button>
                );
              })}
            {/* Section label — on the rail it collapses to a plain divider (grid 0fr + border-bottom) rather than vanishing, so the grouping still reads when only icons are visible. */}
            <div className="cg-sb-group-label">
              <div>
                <div className="cg-sb-group-label-text">Domains</div>
              </div>
            </div>
            {/* Domain list */}
            {NAVIGATION.filter(
              (domain) => !hiddenNav.has(`domain:${domain.id}`),
            ).map((domain) => {
              const isExpanded = expandedDomain === domain.id;
              const DomainIcon = domain.icon;
              return (
                /* `.cg-sb-group` scopes the :has() rule that transfers the highlight from an open domain to its active sub-tab. */ <div
                  key={domain.id}
                  className="cg-sb-group"
                >
                  {/* Domain header */}
                  <button
                    type="button"
                    aria-label={domain.label}
                    aria-expanded={isExpanded}
                    data-active={isExpanded ? "true" : "false"}
                    onClick={() => handleDomainClick(domain.id)}
                    className="cg-sb-item"
                    {...railHover(domain.label, isExpanded)}
                  >
                    <span className="cg-sb-item-inner">
                      <DomainIcon size={16} className="cg-sb-item-icon" />
                      {!collapsed && (
                        <span
                          className="cg-sb-item-label"
                          style={{ transition: labelOpacityTransition }}
                        >
                          {domain.label}
                        </span>
                      )}
                      {/* One chevron, rotated — swapping two icons cannot be animated and reads as a flicker. */}
                      <ChevronRight
                        size={12}
                        className="cg-sb-chevron"
                        data-open={isExpanded ? "true" : "false"}
                      />
                    </span>
                  </button>
                  {/* Sub-tabs — grid 0fr->1fr so the group animates to its intrinsic height, with a connecting line (.cg-sb-sub::before) tying the children back to their parent row. */}
                  <div
                    className="cg-sb-collapsible"
                    data-open={!collapsed && isExpanded ? "true" : "false"}
                    role="region"
                    aria-hidden={!(!collapsed && isExpanded)}
                  >
                    <div>
                      <ul className="cg-sb-sub">
                        {domain.subtabs.map((subtab) => {
                          const path = subtabPath(domain, subtab);
                          const isActive =
                            pathname === path ||
                            pathname.startsWith(`${path}/`);
                          return (
                            <li key={subtab.id}>
                              <button
                                type="button"
                                onClick={() => navigate(path)}
                                className="cg-sb-sub-item"
                                data-active={isActive ? "true" : "false"}
                                tabIndex={!collapsed && isExpanded ? 0 : -1}
                              >
                                <span className="cg-sb-sub-label">
                                  {subtab.label}
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>
                </div>
              );
            })}
            {/* Divider before Platform settings */}
            <div style={{ height: 1, background: T.border, margin: "6px 0" }} />
            {/* Platform settings — routes to the Enterprise Administration console */}
            <button
              type="button"
              aria-label="Platform settings"
              onClick={() => {
                navigate("/admin");
              }}
              className="cg-sb-item"
              data-active={pathname.startsWith("/admin") ? "true" : "false"}
              {...railHover("Platform settings", pathname.startsWith("/admin"))}
            >
              <span
                style={{ color: T.textPrimary, display: "flex", flexShrink: 0 }}
              >
                <Settings size={15} />
              </span>
              {!collapsed && (
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 400,
                    color: T.textPrimary,
                    opacity: 1,
                    transition: labelOpacityTransition,
                    whiteSpace: "nowrap",
                  }}
                >
                  Platform settings
                </span>
              )}
            </button>
            <div style={{ height: 12 }} />
          </nav>

          {/* User strip */}
          <div
            style={{
              borderTop: `1px solid ${T.border}`,
              padding: collapsed ? "10px 12px" : "10px 16px",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              gap: collapsed ? 0 : 10,
              transition: "padding 150ms ease-out",
            }}
          >
            <div
              onMouseEnter={(e) => {
                if (collapsed) {
                  const r = (
                    e.currentTarget as HTMLElement
                  ).getBoundingClientRect();
                  setTooltip({
                    label: user.data?.login ?? "CloudGuard",
                    top: r.top + r.height / 2,
                    left: r.right + 8,
                  });
                }
              }}
              onMouseLeave={() => setTooltip(null)}
              style={{ display: "flex", flexShrink: 0 }}
            >
              <UserActions
                user={
                  user.data ? { avatar_url: user.data.avatar_url } : undefined
                }
                onLogout={logout}
                isLoading={user.isFetching}
              />
            </div>
            {!collapsed && (
              <>
                <div
                  style={{
                    minWidth: 0,
                    flex: 1,
                    opacity: 1,
                    transition: labelOpacityTransition,
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: T.textPrimary,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {user.data?.login ?? "CloudGuard"}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: T.textNav,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    Inference Defense
                  </div>
                </div>
                <button
                  type="button"
                  aria-label={
                    theme === "dark"
                      ? "Switch to light mode"
                      : "Switch to dark mode"
                  }
                  onClick={toggleTheme}
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    padding: 6,
                    borderRadius: 6,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    transition: "background 0.12s",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      T.bgHover;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      "transparent";
                  }}
                >
                  {theme === "dark" ? (
                    <Sun size={14} style={{ color: T.textMuted }} />
                  ) : (
                    <Moon size={14} style={{ color: T.textMuted }} />
                  )}
                </button>
              </>
            )}
          </div>
        </aside>
      </div>

      {/* ── Rail tooltip (only while collapsed) — portaled to <body> so it
              cannot be clipped by any ancestor stacking context. ─────────── */}
      {collapsed &&
        tooltip &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="tooltip"
            style={{
              position: "fixed",
              top: tooltip.top,
              left: tooltip.left,
              transform: "translateY(-50%)",
              background: "var(--cg-bg-primary-sidebar, #1c1c1c)",
              border: `1px solid ${T.border}`,
              color: T.textPrimary,
              padding: "6px 10px",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 500,
              whiteSpace: "nowrap",
              pointerEvents: "none",
              boxShadow: "0 4px 16px rgba(0,0,0,0.35)",
              zIndex: 2147483647,
            }}
          >
            {tooltip.label}
          </div>,
          document.body,
        )}

      {/* ── Conversation panel flyout ──────────────────────────────────────── */}
      {conversationPanelIsOpen && (
        <ConversationPanelWrapper isOpen={conversationPanelIsOpen}>
          <ConversationPanel
            onClose={() => setConversationPanelIsOpen(false)}
          />
        </ConversationPanelWrapper>
      )}

      {/* ── Settings modal ─────────────────────────────────────────────────── */}
      {settingsModalIsOpen && (
        <SettingsModal
          settings={settings}
          onClose={() => setSettingsModalIsOpen(false)}
        />
      )}
    </>
  );
}

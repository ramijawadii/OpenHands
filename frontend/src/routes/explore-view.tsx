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
  Settings2,
} from "lucide-react";
import { NAVIGATION, slugify } from "#/components/features/sidebar/sidebar";
import { SubTabSettings } from "#/components/features/explore/subtab-settings";

type LucideIcon = React.ComponentType<{ size?: number; color?: string }>;

/**
 * Brief, industry-conventional tab labels keyed by the full descriptive item
 * label. The full text is preserved in NAVIGATION (used elsewhere / later); the
 * tab bar shows the concise name. Unmapped labels fall back to the full text.
 */
export const SHORT_LABEL: Record<string, string> = {
  // 1. Discovery & Inventory
  "Multi-cloud resource graph (AWS, Azure, GCP, OCI, Alibaba)":
    "Multi-Cloud Inventory",
  "Shadow asset detection": "Shadow Assets",
  "Tagging & ownership policy": "Tagging & Ownership",
  "Asset change timeline": "Change History",
  "Unmanaged & orphaned resource detection": "Orphaned Resources",
  "Internet-facing asset discovery": "Internet-Facing Assets",
  "Exposed ports, services & certificates": "Exposed Services",
  "Subdomain & DNS enumeration": "DNS & Subdomains",
  "Unknown / unmanaged asset alerts": "Unattributed Assets",
  "Attacker-view exposure scoring": "Exposure Score",
  "Attack path visualization": "Attack Paths",
  "Toxic combination detection": "Toxic Combinations",
  "Blast radius analysis": "Predicted Blast Radius",
  "Business context scoring (criticality, revenue, data sensitivity)":
    "Business Criticality",
  "Exploitability-weighted risk prioritization": "Asset Risk Ranking",
  // 2. Identity
  "Role sprawl & over-privilege detection": "Excessive Permissions",
  "MFA enforcement & gap analysis": "MFA Coverage",
  "PAM & privileged session management": "Privileged Access (PAM)",
  "JIT access & standing access removal": "Just-in-Time Access",
  "Cross-account trust chain analysis": "Account Trust Chains",
  "Admin account hardening": "Admin Hardening",
  "Service account inventory & permissions audit": "Service Accounts",
  "API token & key lifecycle management": "API Keys & Tokens",
  "Workload identities (OIDC, federated, SPIFFE/SPIRE)": "Workload Identities",
  "AI agent identities & permission scoping": "AI Agent Identities",
  "Credential rotation enforcement": "Credential Rotation",
  "Effective permissions graph": "Effective Permissions",
  "Dormant & orphaned identity detection": "Dormant Identities",
  "Identity–resource toxic combinations": "Identity Toxic Combinations",
  "Lateral movement paths from identity": "Lateral Movement Paths",
  "Privilege escalation path analysis": "Escalation Paths",
  // 3. Posture & Governance
  "Misconfiguration detection across all cloud services": "Misconfigurations",
  "Drift detection vs IaC baseline": "Configuration Drift",
  "Secure score (per account, per service, per region)": "Secure Score",
  "Auto-remediation & suggested fixes": "Auto-Remediation",
  "Multi-cloud policy enforcement": "Multi-Cloud Guardrails",
  "CVE scanning across workloads, images & OSes": "CVE Scanning",
  "Risk-based prioritization (CVSS + exploitability + runtime context)":
    "Vulnerability Prioritization",
  "Patch tracking & SLA management": "Patch Management",
  "Remediation validation & re-scan": "Remediation Validation",
  "Zero-day exposure tracking": "Zero-Day Exposure",
  "CIS benchmarks (AWS / GCP / Azure)": "CIS Benchmarks",
  "NIST 800-53 & CSF": "NIST 800-53",
  "PCI-DSS v4": "PCI-DSS",
  HIPAA: "HIPAA",
  "SOC 2 Type II": "SOC 2",
  "ISO 27001": "ISO 27001",
  "GDPR & regional frameworks": "GDPR",
  "Continuous evidence collection": "Continuous Evidence",
  "Audit-ready reporting & export": "Auditor Exports",
  // 4. Code-to-Cloud
  "Terraform scanning (pre-deploy, OPA / Sentinel gates)": "Terraform",
  "CloudFormation / ARM / Bicep analysis": "CloudFormation/ARM",
  "Helm & Kubernetes manifest scanning": "Kubernetes Manifests",
  "CI/CD pipeline gates & break-the-build": "CI/CD Gates",
  "Policy-as-code enforcement": "Policy-as-Code",
  "IaC-to-runtime drift detection": "IaC Drift",
  "Application inventory & ownership mapping": "Application Inventory",
  "Code-level vulnerability context": "SAST",
  "SCA — open source risk in application layer": "SCA",
  "Developer-facing findings & IDE integration": "IDE Integration",
  "App risk score correlated to infrastructure context":
    "Application Risk Score",
  "Reachability analysis (is the vulnerability actually exploitable)":
    "Reachability",
  "Dependency scanning (direct + transitive)": "Dependency Risk",
  "SBOM generation (CycloneDX / SPDX)": "SBOM Generation",
  "VEX statements & vulnerability exceptions": "VEX",
  "Artifact signing — SLSA L1 / L2 / L3": "Artifact Signing (SLSA)",
  "Provenance & Sigstore transparency log": "Build Provenance",
  "Malicious package detection": "Malicious Packages",
  "Git history & PR diff scanning": "Repository Scanning",
  "Pre-commit hooks & branch scanning": "Pre-Commit Hooks",
  "CI/CD variable & pipeline secret exposure": "CI/CD Secrets",
  "Config maps & env file scanning": "Config & Env Files",
  "Cloud-native secret store adoption tracking": "Secret Managers",
  "Verified vs unverified secret triage": "Secret Validation",
  // 5. API Security
  "Automatic API endpoint discovery (agentless + traffic-based)":
    "Endpoint Discovery",
  "Shadow API detection (undocumented, unregistered endpoints)": "Shadow APIs",
  "Zombie API detection (deprecated but still active)": "Zombie APIs",
  "Internal vs external API classification": "API Classification",
  "API ownership & team mapping": "API Ownership",
  "OpenAPI / GraphQL / gRPC schema registry": "Schema Registry",
  "OpenAPI spec drift (schema vs actual traffic)": "Spec Drift",
  "Authentication & authorization schema review": "AuthN & AuthZ",
  "Insecure defaults (verbose errors, no rate limits, open CORS)":
    "Insecure Defaults",
  "mTLS & transport security enforcement": "Transport Security (mTLS)",
  "API versioning risk (old versions still reachable)": "Deprecated Versions",
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
  "API9 — Improper inventory management": "API9 — Inventory",
  "API10 — Unsafe consumption of APIs": "API10 — Unsafe Consumption",
  "L7 real-time traffic inspection": "L7 Inspection",
  "Anomalous request pattern detection": "Request Anomalies",
  "Rate limit enforcement & abuse detection": "Rate Limit Abuse",
  "Bot vs human traffic classification": "Bot Detection",
  "Credential stuffing & brute force on API endpoints": "Credential Stuffing",
  "Data exfiltration via API response analysis": "Response Exfiltration",
  "API-specific attack signatures (injection, fuzzing, scraping)":
    "Attack Signatures",
  "Behavioral baseline per endpoint": "Endpoint Baselines",
  "Sequence anomaly (abnormal call chains)": "Call Chain Anomalies",
  "Privilege escalation via API": "API Escalation",
  "Lateral movement through internal APIs": "API Lateral Movement",
  "Alert correlation with CDR & identity layer": "Cross-Layer Correlation",
  "API catalog & lifecycle management": "API Lifecycle",
  "Deprecation & sunset policy enforcement": "Deprecation & Sunset",
  "Sensitive data in API responses (PII, tokens, secrets)": "PII in Responses",
  "Regulatory mapping (GDPR, PCI-DSS, HIPAA)": "Regulatory Mapping",
  "Consumer access audit (who calls what, how often)": "Consumer Audit",
  "API SLA & uptime risk scoring": "API SLA Risk",
  // 6. Workload & Runtime
  "VM vulnerability scanning & patching": "VM Vulnerabilities",
  "Serverless function security (Lambda, Cloud Functions)":
    "Serverless Security",
  "Runtime anomaly detection (process, file, syscall)": "Runtime Threats",
  "Malware detection & quarantine": "Malware Detection",
  "File integrity monitoring (FIM)": "File Integrity (FIM)",
  "eBPF-based kernel-level visibility": "Kernel Visibility (eBPF)",
  "Cluster posture (kube-bench, CIS K8s benchmarks)": "Cluster Posture",
  "RBAC analysis & violations": "Kubernetes RBAC",
  "Container image scanning (CVE, malware, embedded secrets)":
    "Container Images",
  "Registry security & image signing (Cosign)": "Registry & Image Signing",
  "Runtime container defense & drift detection": "Container Runtime",
  "Admission controller policy enforcement": "Admission Control",
  "VPC & security group analysis": "VPC & Security Groups",
  "NACL & firewall rule audit": "Firewall Rules",
  "Flow log ingestion & anomaly detection": "Flow Log Analysis",
  "DDoS & WAF coverage assessment": "DDoS & WAF Coverage",
  "East-west micro-segmentation enforcement": "Micro-Segmentation",
  "Zero trust network policy gaps": "Zero Trust Gaps",
  "Managed service misconfiguration (RDS, managed K8s, queues)":
    "Managed Service Config",
  "Event-driven attack surface (triggers, event buses)":
    "Event & Trigger Surface",
  "Privilege escalation via serverless triggers": "Trigger Escalation",
  "Cold-start & ephemeral workload blind spots": "Cold-Start Blind Spots",
  "Function-to-function permission sprawl": "Function Permissions",
  // 7. Data & SaaS
  "Data store discovery & classification (S3, RDS, BigQuery, Blob, Snowflake)":
    "Data Store Discovery",
  "PII / PCI / PHI / PHD sensitive data detection": "Sensitive Data Discovery",
  "Encryption coverage (at-rest & in-transit)": "Encryption Coverage",
  "Excess data access (who can reach what data)": "Excessive Data Access",
  "Data flow mapping (how data moves between services)": "Data Flow Mapping",
  "DLP policy enforcement & violation alerting": "DLP Policies",
  "Data residency & sovereignty compliance": "Data Residency",
  "M365 tenant config, sharing & guest access": "Microsoft 365",
  "Google Workspace DLP & guest policies": "Google Workspace",
  "Salesforce org permissions & IP restrictions": "Salesforce",
  "GitHub org security & branch protection": "GitHub",
  "Slack & collaboration tool posture": "Slack",
  "OAuth app inventory, scope audit & risk scoring": "OAuth App Risk",
  "Shadow SaaS detection & unmanaged app access": "Shadow SaaS",
  // 8. Detection & Response
  "Real-time log ingestion & normalization (CloudTrail, Azure Monitor, GCP)":
    "Telemetry Ingestion",
  "SIEM-style correlation across cloud telemetry": "Detection Correlation",
  "Behavioral anomaly detection (UEBA)": "UEBA",
  "Lateral movement & pivot detection": "Lateral Movement Detections",
  "Privilege escalation detection": "Escalation Detections",
  "API abuse & credential stuffing signals": "API Abuse",
  "Multi-cloud alert deduplication & normalization": "Alert Normalization",
  "IOC & IOA feed ingestion (commercial + open source)": "IOC/IOA Feeds",
  "MITRE ATT&CK cloud matrix coverage mapping": "MITRE ATT&CK Mapping",
  "Adversary campaign & TTP tracking": "Campaigns & TTPs",
  "Threat actor attribution & profiling": "Threat Actors",
  "Intelligence-enriched alert context": "Alert Enrichment",
  "Cloud provider CVE & advisory watch": "Provider Advisories",
  "Alert triage & case management": "Case Management",
  "SOAR playbook automation": "Response Playbooks",
  "Automated containment (isolate, credential revoke, quarantine)":
    "Auto-Containment",
  "Forensic timeline & evidence collection": "Forensic Evidence",
  "Post-incident blast radius assessment": "Incident Blast Radius",
  "MTTR tracking & SLA reporting": "MTTR & SLA",
  "Runbook library & response templates": "Runbook Library",
  "SIEM forwarding (Splunk, Microsoft Sentinel, Chronicle, QRadar)":
    "SIEM Forwarding",
  "Ticketing (Jira, ServiceNow, PagerDuty, Linear)": "Ticketing & ITSM",
  "EDR / XDR bidirectional telemetry (CrowdStrike, SentinelOne, Defender)":
    "EDR/XDR",
  "Chat ops (Slack, Teams)": "ChatOps",
  "Webhook & REST API automation": "Webhooks & REST API",
  "SOAR connectors (Palo Alto XSOAR, Swimlane, Tines)": "SOAR Connectors",
  // 9. AI & Emerging Threats
  "AI workload & model inventory": "Model Inventory",
  "Training infrastructure misconfiguration": "Training Infrastructure",
  "Model access controls & least privilege": "Model Access Control",
  "AI BOM (model cards, weights, training data lineage)": "AI-BOM",
  "Shadow AI & unregistered model detection": "Shadow AI",
  "Prompt injection detection & input filtering": "Prompt Injection",
  "Sensitive data leakage from LLM outputs": "Output Data Leakage",
  "Model theft & extraction risk": "Model Extraction",
  "Insecure plugin / tool / MCP integrations": "Plugin & MCP Risk",
  "LLM endpoint inventory & public exposure": "LLM Endpoint Exposure",
  "Jailbreak & policy bypass detection": "Jailbreak & Bypass",
  "Agent permission scoping & least privilege": "Agent Permission Scope",
  "Agent action audit logs & observability": "Agent Action Logs",
  "Agentic workflow blast radius mapping": "Agent Blast Radius",
  "Multi-agent trust chain analysis": "Agent Trust Chains",
  "Runtime agent behavioral monitoring & anomaly detection":
    "Agent Behavior Monitoring",
  "Human-in-the-loop enforcement policy": "Human-in-the-Loop",
  "Zero-day cloud service vulnerability watch": "Emerging CVE Watch",
  "Continuous threat exposure management cycles": "CTEM Cycles",
  "Adversarial ML & model poisoning tracking": "Adversarial ML",
  "New attack technique simulation & purple teaming": "Attack Simulation (BAS)",
  "Exposure validation (confirm if attack paths are exploitable)":
    "Exposure Validation",
};

/**
 * Reserved capability-position slug for the sub-tab's own configuration.
 * Settings is scoped to the SUB-TAB (the engine + its connectors), not to a
 * capability, so it sits at the sub-tab's level rather than as an L4 view —
 * position matches scope. Capability-scoped tuning stays in the `Policy` view.
 * Guarded by a test: no capability may ever take this slug.
 */
export const SETTINGS_SLUG = "settings";

/**
 * Level-4 view slugs renamed alongside the strip normalization. The view is a
 * PATH segment now, so renaming one moves real URLs.
 *   security-graph -> graph        (freed the name for the global destination)
 *   agent-actions  -> findings     (became a provenance filter, not a tab)
 * `settings` is handled separately: it does not map to another view, it leaves
 * the capability entirely for the sub-tab-level Settings page.
 */
const LEGACY_VIEW_SLUGS: Record<string, string> = {
  "security-graph": "graph",
  "agent-actions": "findings",
};

/**
 * Level-3 capability slugs renamed in the July 2026 navigation pass. Old URL
 * -> new slug, keyed by `<domain>/<sub-tab>/<old capability>`. Without this a
 * stale bookmark silently resolves to the sub-tab's FIRST capability (the
 * lookup falls back to index 0), which is worse than a 404: the page looks
 * fine and shows the wrong thing. Redirected in place, so the address bar
 * self-heals on first visit.
 */
const LEGACY_CAPABILITY_SLUGS: Record<string, string> = {
  "discovery-inventory/cloud-asset-inventory/resource-graph":
    "multi-cloud-inventory",
  "discovery-inventory/cloud-asset-inventory/change-timeline": "change-history",
  "discovery-inventory/external-attack-surface/internet-facing":
    "internet-facing-assets",
  "discovery-inventory/external-attack-surface/unknown-assets":
    "unattributed-assets",
  "discovery-inventory/external-attack-surface/exposure-scoring":
    "exposure-score",
  "discovery-inventory/risk-attack-graph/blast-radius":
    "predicted-blast-radius",
  "discovery-inventory/risk-attack-graph/business-context":
    "business-criticality",
  "discovery-inventory/risk-attack-graph/risk-prioritization":
    "asset-risk-ranking",
  "identity/human-iam-ciem/over-privilege": "excessive-permissions",
  "identity/human-iam-ciem/mfa-gaps": "mfa-coverage",
  "identity/human-iam-ciem/pam": "privileged-access-pam",
  "identity/human-iam-ciem/jit-access": "just-in-time-access",
  "identity/human-iam-ciem/trust-chains": "account-trust-chains",
  "identity/non-human-identity-nhi/keys-tokens": "api-keys-tokens",
  "identity/non-human-identity-nhi/agent-identities": "ai-agent-identities",
  "identity/identity-risk-graph/toxic-combinations":
    "identity-toxic-combinations",
  "identity/identity-risk-graph/lateral-movement": "lateral-movement-paths",
  "identity/identity-risk-graph/privilege-escalation": "escalation-paths",
  "posture-governance/cloud-posture-cspm/drift-detection":
    "configuration-drift",
  "posture-governance/cloud-posture-cspm/policy-enforcement":
    "multi-cloud-guardrails",
  "posture-governance/vulnerability-management/risk-prioritization":
    "vulnerability-prioritization",
  "posture-governance/vulnerability-management/patch-sla": "patch-management",
  "posture-governance/compliance-governance/evidence-collection":
    "continuous-evidence",
  "posture-governance/compliance-governance/audit-reporting": "auditor-exports",
  "code-to-cloud/iac-devsecops/k8s-manifests": "kubernetes-manifests",
  "code-to-cloud/iac-devsecops/pipeline-gates": "ci-cd-gates",
  "code-to-cloud/app-security-posture-aspm/app-inventory":
    "application-inventory",
  "code-to-cloud/app-security-posture-aspm/app-risk-score":
    "application-risk-score",
  "code-to-cloud/supply-chain-sbom/dependencies": "dependency-risk",
  "code-to-cloud/supply-chain-sbom/sbom": "sbom-generation",
  "code-to-cloud/supply-chain-sbom/slsa-signing": "artifact-signing-slsa",
  "code-to-cloud/supply-chain-sbom/provenance": "build-provenance",
  "code-to-cloud/secrets-detection/git-scanning": "repository-scanning",
  "code-to-cloud/secrets-detection/pipeline-secrets": "ci-cd-secrets",
  "code-to-cloud/secrets-detection/config-env": "config-env-files",
  "code-to-cloud/secrets-detection/secret-stores": "secret-managers",
  "code-to-cloud/secrets-detection/secret-triage": "secret-validation",
  "api-security/api-posture-design-risk/auth-schema": "authn-authz",
  "api-security/api-posture-design-risk/mtls": "transport-security-mtls",
  "api-security/api-posture-design-risk/versioning-risk": "deprecated-versions",
  "api-security/owasp-api-top-10/api9-inventory-mgmt": "api9-inventory",
  "api-security/api-runtime-traffic-analysis/anomaly-detection":
    "request-anomalies",
  "api-security/api-runtime-traffic-analysis/rate-limiting": "rate-limit-abuse",
  "api-security/api-runtime-traffic-analysis/data-exfiltration":
    "response-exfiltration",
  "api-security/api-threat-detection/behavioral-baseline": "endpoint-baselines",
  "api-security/api-threat-detection/sequence-anomaly": "call-chain-anomalies",
  "api-security/api-threat-detection/privilege-escalation": "api-escalation",
  "api-security/api-threat-detection/lateral-movement": "api-lateral-movement",
  "api-security/api-threat-detection/alert-correlation":
    "cross-layer-correlation",
  "api-security/api-governance-compliance/api-catalog": "api-lifecycle",
  "api-security/api-governance-compliance/deprecation-policy":
    "deprecation-sunset",
  "api-security/api-governance-compliance/sensitive-data": "pii-in-responses",
  "api-security/api-governance-compliance/sla-scoring": "api-sla-risk",
  "workload-runtime/workload-protection-cwpp/vm-scanning": "vm-vulnerabilities",
  "workload-runtime/workload-protection-cwpp/runtime-anomaly":
    "runtime-threats",
  "workload-runtime/workload-protection-cwpp/fim": "file-integrity-fim",
  "workload-runtime/workload-protection-cwpp/ebpf-visibility":
    "kernel-visibility-ebpf",
  "workload-runtime/containers-kubernetes-kspm/rbac-analysis":
    "kubernetes-rbac",
  "workload-runtime/containers-kubernetes-kspm/image-scanning":
    "container-images",
  "workload-runtime/containers-kubernetes-kspm/registry-signing":
    "registry-image-signing",
  "workload-runtime/containers-kubernetes-kspm/runtime-defense":
    "container-runtime",
  "workload-runtime/network-security/flow-logs": "flow-log-analysis",
  "workload-runtime/network-security/ddos-waf": "ddos-waf-coverage",
  "workload-runtime/network-security/zero-trust": "zero-trust-gaps",
  "workload-runtime/serverless-paas/managed-services": "managed-service-config",
  "workload-runtime/serverless-paas/event-driven-surface":
    "event-trigger-surface",
  "workload-runtime/serverless-paas/ephemeral-blind-spots":
    "cold-start-blind-spots",
  "data-saas/data-security-dspm/data-discovery": "data-store-discovery",
  "data-saas/data-security-dspm/sensitive-data": "sensitive-data-discovery",
  "data-saas/data-security-dspm/excess-access": "excessive-data-access",
  "data-saas/data-security-dspm/dlp": "dlp-policies",
  "data-saas/saas-security-sspm/oauth-apps": "oauth-app-risk",
  "detection-response/cloud-detection-cdr/log-ingestion": "telemetry-ingestion",
  "detection-response/cloud-detection-cdr/correlation": "detection-correlation",
  "detection-response/cloud-detection-cdr/lateral-movement":
    "lateral-movement-detections",
  "detection-response/cloud-detection-cdr/privilege-escalation":
    "escalation-detections",
  "detection-response/cloud-detection-cdr/alert-dedup": "alert-normalization",
  "detection-response/threat-intelligence/mitre-att-ck": "mitre-att-ck-mapping",
  "detection-response/threat-intelligence/ttp-tracking": "campaigns-ttps",
  "detection-response/threat-intelligence/actor-attribution": "threat-actors",
  "detection-response/threat-intelligence/enriched-context": "alert-enrichment",
  "detection-response/threat-intelligence/cve-watch": "provider-advisories",
  "detection-response/incident-response/triage-cases": "case-management",
  "detection-response/incident-response/soar-playbooks": "response-playbooks",
  "detection-response/incident-response/forensics": "forensic-evidence",
  "detection-response/incident-response/blast-radius": "incident-blast-radius",
  "detection-response/incident-response/runbooks": "runbook-library",
  "detection-response/soc-integrations/ticketing": "ticketing-itsm",
  "detection-response/soc-integrations/webhooks-api": "webhooks-rest-api",
  "ai-emerging-threats/ai-security-posture-ai-spm/training-infra":
    "training-infrastructure",
  "ai-emerging-threats/ai-security-posture-ai-spm/model-access":
    "model-access-control",
  "ai-emerging-threats/llm-genai-attack-surface/data-leakage":
    "output-data-leakage",
  "ai-emerging-threats/llm-genai-attack-surface/model-theft":
    "model-extraction",
  "ai-emerging-threats/llm-genai-attack-surface/insecure-plugins":
    "plugin-mcp-risk",
  "ai-emerging-threats/llm-genai-attack-surface/llm-endpoints":
    "llm-endpoint-exposure",
  "ai-emerging-threats/llm-genai-attack-surface/jailbreak-detection":
    "jailbreak-bypass",
  "ai-emerging-threats/ai-agent-identity-governance/agent-permissions":
    "agent-permission-scope",
  "ai-emerging-threats/ai-agent-identity-governance/agent-audit-logs":
    "agent-action-logs",
  "ai-emerging-threats/ai-agent-identity-governance/workflow-blast-radius":
    "agent-blast-radius",
  "ai-emerging-threats/ai-agent-identity-governance/trust-chains":
    "agent-trust-chains",
  "ai-emerging-threats/ai-agent-identity-governance/behavioral-monitoring":
    "agent-behavior-monitoring",
  "ai-emerging-threats/emerging-threat-simulation-ctem/zero-day-watch":
    "emerging-cve-watch",
  "ai-emerging-threats/emerging-threat-simulation-ctem/purple-teaming":
    "attack-simulation-bas",
};

/**
 * The standard archetype-B view strip. `Agent actions` was removed as a tab: it
 * is a PROVENANCE attribute of a finding, not a separate workspace, and it was
 * present on only 8 of the 14 B sub-tabs with no rule behind the split. It
 * returns as a filter on Findings once that view carries data.
 * `Security graph` became `Graph` so it stops colliding with the sidebar's
 * Global Security Graph.
 */
const B_VIEWS = [
  "Overview",
  "Issues",
  "Findings",
  "Graph",
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
  "2.1": { archetype: "B", views: B_VIEWS },
  "2.2": { archetype: "B", views: B_VIEWS },
  "2.3": { archetype: "G", views: [] },
  "3.1": { archetype: "B", views: B_VIEWS },
  "3.2": { archetype: "B", views: B_VIEWS },
  "3.3": {
    archetype: "S",
    views: ["Overview", "Frameworks", "Evidence", "Reports"],
  },
  "4.1": { archetype: "B", views: B_VIEWS },
  "4.2": { archetype: "B", views: B_VIEWS },
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
    views: ["Overview", "Detections", "Traffic", "Graph", "Reports"],
  },
  "5.5": {
    archetype: "C",
    views: ["Overview", "Detections", "Graph", "Reports"],
  },
  "5.6": {
    archetype: "S",
    views: ["Overview", "Catalog", "Evidence", "Reports"],
  },
  "6.1": { archetype: "B", views: B_VIEWS },
  "6.2": { archetype: "B", views: B_VIEWS },
  "6.3": {
    archetype: "B",
    views: ["Overview", "Issues", "Findings", "Graph", "Policy", "Reports"],
  },
  "6.4": {
    archetype: "B",
    views: ["Overview", "Issues", "Findings", "Graph", "Policy"],
  },
  "7.1": {
    archetype: "A",
    views: ["Overview", "Inventory", "Findings", "Graph", "Policy"],
  },
  "7.2": {
    archetype: "A",
    views: ["Overview", "Inventory", "Findings", "Policy"],
  },
  "8.1": {
    archetype: "C",
    views: ["Overview", "Detections", "Graph", "Reports"],
  },
  "8.2": {
    archetype: "S",
    views: ["Overview", "Feeds", "ATT&CK coverage", "Reports"],
  },
  "8.3": {
    archetype: "C",
    views: ["Overview", "Cases", "Timeline", "Reports"],
  },
  "8.4": { archetype: "S", views: ["Overview", "Connectors"] },
  "9.1": {
    archetype: "A",
    views: ["Overview", "Inventory", "Findings", "Policy"],
  },
  "9.2": {
    archetype: "B",
    views: ["Overview", "Issues", "Findings", "Graph", "Policy"],
  },
  "9.3": {
    archetype: "C",
    views: ["Overview", "Issues", "Graph", "Policy", "Reports"],
  },
  "9.4": {
    archetype: "C",
    views: ["Overview", "Simulations", "Detections", "Graph", "Reports"],
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
  const { domainId, subtabId, capabilityId, viewId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const contentRef = React.useRef<HTMLDivElement | null>(null);

  // Resolved by STABLE slug (nav data), never by the display label — renaming a
  // label must not move a page. URL = /explore/<domain>/<sub-tab>/<capability>/<view>
  const domain = NAVIGATION.find((d) => d.slug === domainId);
  const subtab = domain?.subtabs.find((s) => s.slug === subtabId);
  const viewSlug = viewId ?? null;
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
  }, [capabilityId, viewSlug]);

  // Heal older URLs in one hop, before they can resolve to the wrong page:
  //   a) pre-rename capability slugs  b) `?view=` now carried in the path.
  // Both rewrite with `replace`, so the address bar self-heals and Back still
  // returns where the user came from rather than bouncing through the old URL.
  const legacyView = searchParams.get("view");
  const isSettings = capabilityId === SETTINGS_SLUG;
  React.useEffect(() => {
    if (!domainId || !subtabId) return;
    const rest = new URLSearchParams(searchParams);
    rest.delete("view");
    const q = rest.toString();
    const suffix = q ? `?${q}` : "";

    // A bare /explore/<domain>/<sub-tab> used to render capability #1 SILENTLY
    // (the lookup floors at index 0), so the URL and the page disagreed. Make
    // the landing explicit until the sub-tab overview exists.
    if (!capabilityId) {
      const first = subtab?.items[0];
      if (first)
        navigate(`/explore/${domainId}/${subtabId}/${first.slug}${suffix}`, {
          replace: true,
        });
      return;
    }
    if (isSettings) return; // sub-tab settings takes no view segment

    const renamed =
      LEGACY_CAPABILITY_SLUGS[`${domainId}/${subtabId}/${capabilityId}`];
    const rawView = viewId ?? legacyView;
    // The old L4 `settings` view is now a sub-tab-level page: drop the
    // capability rather than mapping it to another view.
    if (rawView === SETTINGS_SLUG) {
      navigate(`/explore/${domainId}/${subtabId}/${SETTINGS_SLUG}${suffix}`, {
        replace: true,
      });
      return;
    }
    const revView = rawView ? LEGACY_VIEW_SLUGS[rawView] : undefined;
    if (!renamed && !legacyView && !revView) return;
    const view = revView ?? rawView;
    navigate(
      `/explore/${domainId}/${subtabId}/${renamed ?? capabilityId}` +
        `${view ? `/${view}` : ""}${suffix}`,
      { replace: true },
    );
  }, [
    domainId,
    subtabId,
    capabilityId,
    viewId,
    legacyView,
    isSettings,
    subtab,
    searchParams,
    navigate,
  ]);

  if (!domain || !subtab) {
    return (
      <div
        data-testid="explore-view"
        style={{ height: "100%", width: "100%" }}
      />
    );
  }

  const spec = VIEW_SPEC[subtab.id] ?? {
    archetype: "B" as const,
    views: B_VIEWS,
  };
  const isGraph = spec.archetype === "G";
  const activeCap = Math.max(
    0,
    subtab.items.findIndex((it) => it.slug === capabilityId),
  );
  const view = Math.max(
    0,
    spec.views.findIndex((v) => slugify(v) === viewSlug),
  );
  const capItem = subtab.items[activeCap] ?? subtab.items[0];
  const capLabel = capItem ? (SHORT_LABEL[capItem.label] ?? capItem.label) : "";

  // Taxonomy lives in the path; the query is reserved for genuine STATE
  // (filters, time range) and is carried across navigation untouched.
  const q = searchParams.toString();
  const href = (capIdx: number, viewIdx: number) => {
    const v = viewIdx > 0 ? `/${slugify(spec.views[viewIdx])}` : "";
    return (
      `/explore/${domain.slug}/${subtab.slug}/${subtab.items[capIdx].slug}` +
      `${v}${q ? `?${q}` : ""}`
    );
  };
  // Switching capability keeps the current view: the view strip is identical
  // across every capability of a sub-tab, so resetting it would lose the
  // user's place for no reason.
  const goCap = (i: number) => navigate(href(i, view));
  const goView = (i: number) => navigate(href(activeCap, i));
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
        // `activeCap` floors at 0, so on the Settings page capability #1 would
        // ALSO report itself selected — two selected tabs in one tablist.
        const on = !isSettings && i === activeCap;
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
            // +1 so ←/→ cycle through the trailing Settings tab too.
            onKeyDown={(e) => onTabKey(e, i, subtab.items.length + 1)}
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

      {/* Sub-tab Settings — the LAST tab in the strip, styled and spaced
          exactly like the capabilities. It reads as a peer, so it behaves as
          one: same role, same roving-tablist cycle. Its different SCOPE (it
          configures the sub-tab rather than showing a slice of its data) is
          carried by the gear icon and the trailing position. */}
      <button
        type="button"
        role="tab"
        aria-selected={isSettings}
        tabIndex={isSettings ? 0 : -1}
        title={`Configure the data behind ${subtab.label}`}
        onClick={() =>
          navigate(
            `/explore/${domain.slug}/${subtab.slug}/${SETTINGS_SLUG}${q ? `?${q}` : ""}`,
          )
        }
        onKeyDown={(e) =>
          onTabKey(e, subtab.items.length, subtab.items.length + 1)
        }
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 7,
          background: "transparent",
          border: "none",
          borderBottom: `2px solid ${isSettings ? "var(--cg-accent)" : "transparent"}`,
          marginBottom: -1,
          padding: "0 1px 10px",
          color: isSettings ? "var(--cg-text-primary)" : "var(--cg-text-nav)",
          fontSize: 13,
          fontWeight: isSettings ? 600 : 400,
          whiteSpace: "nowrap",
          cursor: "pointer",
          flexShrink: 0,
          transition: "color 120ms ease",
        }}
      >
        <Settings2
          size={14}
          color={isSettings ? "var(--cg-accent)" : "var(--cg-text-muted)"}
        />
        Settings
      </button>
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
    <div
      style={{
        padding: "10px 36px 28px",
        maxWidth: 1760,
        margin: "0 auto",
        width: "100%",
        minWidth: 0,
        boxSizing: "border-box",
      }}
    >
      {/* breadcrumb — Domain (clickable) › Sub-tab (current). No capability dup. */}
      <nav
        aria-label="Breadcrumb"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          fontSize: 12.5,
          color: "var(--cg-text-muted)",
          marginBottom: 10,
        }}
      >
        <button
          type="button"
          style={crumb}
          onClick={() => {
            const first = domain.subtabs[0];
            if (first) navigate(`/explore/${domain.slug}/${first.slug}`);
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

      {/* eslint-disable-next-line no-nested-ternary */}
      {isSettings ? (
        <div ref={contentRef}>
          <SubTabSettings
            domainLabel={domain.label}
            subtabLabel={subtab.label}
          />
        </div>
      ) : isGraph ? (
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
            data-capability={capabilityId}
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
    </div>
  );
}

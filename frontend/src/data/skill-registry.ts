export interface Skill {
  name: string;
  label: string;
  domain: string;
  description: string;
  prompt: string;
}

export const SKILL_DOMAINS = [
  "IDENTITY",
  "POSTURE",
  "WORKLOAD",
  "NETWORK",
  "DATA",
  "CHAIN",
  "DIAGRAMS",
] as const;

export type SkillDomain = (typeof SKILL_DOMAINS)[number];

export const SKILLS: Skill[] = [
  // ── IDENTITY ───────────────────────────────────────────────────────────────
  {
    name: "iam-aws",
    label: "AWS IAM",
    domain: "IDENTITY",
    description: "Root account, users, roles, privilege escalation, trust relationships, SCPs",
    prompt: 'Run a deep AWS IAM assessment. Call _invoke_skill("iam-aws") to load the methodology, then enumerate root account, IAM users, roles, policies, privilege escalation paths, trust relationships, and SCPs. Produce a structured findings report.',
  },
  {
    name: "iam-azure",
    label: "Azure Entra ID",
    domain: "IDENTITY",
    description: "Privileged roles, service principals, PIM, conditional access, legacy auth",
    prompt: 'Run an Azure Entra ID and RBAC assessment. Call _invoke_skill("iam-azure") to load the methodology, then assess privileged roles, service principals, PIM configurations, conditional access policies, and legacy authentication.',
  },
  {
    name: "iam-gcp",
    label: "GCP IAM",
    domain: "IDENTITY",
    description: "Resource hierarchy, primitive roles, service account keys, workload identity",
    prompt: 'Run a GCP IAM assessment. Call _invoke_skill("iam-gcp") to load the methodology, then assess resource hierarchy, primitive roles, service account keys, workload identity bindings, and allUsers misconfigurations.',
  },
  {
    name: "identity-federation",
    label: "Identity Federation",
    domain: "IDENTITY",
    description: "SAML validation, OIDC issuer pinning, GitHub Actions wildcards, WIF",
    prompt: 'Assess identity federation security. Call _invoke_skill("identity-federation") to load the methodology, then review SAML assertion validation, OIDC issuer pinning, GitHub Actions wildcard conditions, and Workload Identity Federation configurations.',
  },
  {
    name: "privileged-access",
    label: "Privileged Access",
    domain: "IDENTITY",
    description: "Root/admin accounts, break-glass, JIT, PIM, privileged session logging",
    prompt: 'Assess privileged access management. Call _invoke_skill("privileged-access") to load the methodology, then review root/admin account usage, break-glass procedures, JIT access, PIM configurations, and privileged session audit logging.',
  },

  // ── POSTURE ────────────────────────────────────────────────────────────────
  {
    name: "compliance",
    label: "Compliance",
    domain: "POSTURE",
    description: "NIST, SOC2, PCI-DSS, HIPAA, ISO 27001, GDPR, Security Hub, AWS Config",
    prompt: 'Run a compliance assessment. Call _invoke_skill("compliance") to load the methodology, then evaluate controls against the relevant framework (NIST, SOC2, PCI-DSS, HIPAA, ISO 27001, or GDPR). Generate a prioritised control gap report.',
  },
  {
    name: "cis-benchmarks",
    label: "CIS Benchmarks",
    domain: "POSTURE",
    description: "CIS Foundations for AWS/Azure/GCP, Kubernetes, Docker, control-level gaps",
    prompt: 'Run a CIS Benchmark assessment. Call _invoke_skill("cis-benchmarks") to load the methodology, then audit all CIS controls for the target platform and produce a control-level gap analysis with remediation priority ordering.',
  },
  {
    name: "cloud-misconfiguration",
    label: "Misconfiguration",
    domain: "POSTURE",
    description: "CSPM findings, default configs, over-permissive policies, unintended exposure",
    prompt: 'Assess cloud misconfiguration posture. Call _invoke_skill("cloud-misconfiguration") to load the methodology, then review CSPM findings, default configurations, over-permissive policies, and unintended resource exposure across all services.',
  },
  {
    name: "terraform-iac-security",
    label: "IaC Security",
    domain: "POSTURE",
    description: "Terraform misconfigs, Checkov/tfsec/Semgrep, drift detection, state file exposure",
    prompt: 'Run an IaC security assessment. Call _invoke_skill("terraform-iac-security") to load the methodology, then scan Terraform configurations with Checkov and tfsec, detect drift, check for hardcoded secrets, and review state file access controls.',
  },

  // ── WORKLOAD ───────────────────────────────────────────────────────────────
  {
    name: "kubernetes-security",
    label: "Kubernetes",
    domain: "WORKLOAD",
    description: "RBAC, pod security, network policies, admission controllers, node security",
    prompt: 'Run a Kubernetes security assessment. Call _invoke_skill("kubernetes-security") to load the methodology, then assess RBAC bindings, pod security standards, network policies, admission controller configuration, secrets management, and node hardening.',
  },
  {
    name: "container-registry",
    label: "Container Registry",
    domain: "WORKLOAD",
    description: "Image vulnerabilities, exposed registries, signing, base image hygiene, ECR/ACR/GCR",
    prompt: 'Assess container registry security. Call _invoke_skill("container-registry") to load the methodology, then scan images for vulnerabilities, check for exposed registries, verify image signing, and audit ECR/ACR/GCR access policies.',
  },
  {
    name: "docker-security",
    label: "Docker Security",
    domain: "WORKLOAD",
    description: "Privileged containers, root user, host mounts, capabilities, seccomp, daemon",
    prompt: 'Run a Docker security assessment. Call _invoke_skill("docker-security") to load the methodology, then check for privileged containers, root user execution, dangerous host mounts, excessive capabilities, seccomp profiles, and Docker daemon configuration.',
  },
  {
    name: "patch-status",
    label: "Patch Status",
    domain: "WORKLOAD",
    description: "EC2/VM patch compliance, SSM Patch Manager, Azure Update, EOL OS detection",
    prompt: 'Assess patch compliance status. Call _invoke_skill("patch-status") to load the methodology, then audit EC2/VM patch levels via SSM Patch Manager, identify EOL operating systems, and produce a patch SLA compliance report.',
  },
  {
    name: "vulnerability-scanning",
    label: "Vulnerability Scan",
    domain: "WORKLOAD",
    description: "Inspector/Defender findings, CISA KEV cross-reference, CVE triage, scanner gaps",
    prompt: 'Run a vulnerability assessment. Call _invoke_skill("vulnerability-scanning") to load the methodology, then pull Inspector/Defender/SCC findings, cross-reference against the CISA KEV list, triage by exploitability, and identify scanner coverage gaps.',
  },

  // ── NETWORK ────────────────────────────────────────────────────────────────
  {
    name: "network-exposure",
    label: "Network Firewall",
    domain: "NETWORK",
    description: "Security groups, NSGs, dangerous open ports, default VPCs, VPC flow logs",
    prompt: 'Audit network exposure. Call _invoke_skill("network-exposure") to load the methodology, then review security group rules, NSGs, dangerous open ports (22, 3389, 5900), default VPC usage, and VPC flow log coverage.',
  },
  {
    name: "public-exposure",
    label: "Internet Exposure",
    domain: "NETWORK",
    description: "EC2, load balancers, API gateways, Kubernetes API, dangling IPs, admin panels",
    prompt: 'Discover internet-facing assets. Call _invoke_skill("public-exposure") to load the methodology, then enumerate all publicly accessible EC2 instances, load balancers, API gateways, Kubernetes API servers, dangling IPs, and exposed admin interfaces.',
  },
  {
    name: "cloud-metadata-exposure",
    label: "Metadata Exposure",
    domain: "NETWORK",
    description: "IMDSv1 vs IMDSv2, SSRF credential theft paths, IMDS security on ECS/Lambda",
    prompt: 'Assess cloud metadata service exposure. Call _invoke_skill("cloud-metadata-exposure") to load the methodology, then identify EC2 instances still using IMDSv1, assess SSRF credential theft paths, and review IMDS security on ECS and Lambda.',
  },
  {
    name: "dns-security",
    label: "DNS Security",
    domain: "NETWORK",
    description: "Zone transfer, DNSSEC, dangling DNS, subdomain takeover, Route 53/Azure DNS",
    prompt: 'Run a DNS security assessment. Call _invoke_skill("dns-security") to load the methodology, then check for zone transfer vulnerabilities, DNSSEC configuration, dangling DNS records, and subdomain takeover risks in Route 53/Azure DNS/Cloud DNS.',
  },
  {
    name: "tls-certificate",
    label: "TLS Certificates",
    domain: "NETWORK",
    description: "Certificate expiry, weak protocols, cipher suites, mTLS, ACM/Key Vault",
    prompt: 'Assess TLS certificate security. Call _invoke_skill("tls-certificate") to load the methodology, then audit certificate expiry dates, weak protocol versions (TLS 1.0/1.1), cipher suite strength, mTLS configuration, and ACM/Key Vault certificate management.',
  },

  // ── DATA ───────────────────────────────────────────────────────────────────
  {
    name: "s3-exposure",
    label: "Object Storage",
    domain: "DATA",
    description: "Public buckets, ACL misconfigs, cross-account access, Azure Blob, GCS exposure",
    prompt: 'Assess object storage exposure. Call _invoke_skill("s3-exposure") to load the methodology, then identify publicly accessible S3 buckets, ACL misconfigurations, cross-account access, presigned URL abuse, and equivalent findings in Azure Blob and GCS.',
  },
  {
    name: "data-loss-prevention",
    label: "Data Loss Prevention",
    domain: "DATA",
    description: "Sensitive data exposure, egress controls, Macie/Purview findings, exfiltration paths",
    prompt: 'Run a DLP assessment. Call _invoke_skill("data-loss-prevention") to load the methodology, then review Macie/Purview findings, egress control gaps, data classification coverage, and potential exfiltration paths from cloud storage and databases.',
  },
  {
    name: "database-security",
    label: "Database Security",
    domain: "DATA",
    description: "RDS/Cloud SQL exposure, encryption, authentication, network access, backup config",
    prompt: 'Assess database security posture. Call _invoke_skill("database-security") to load the methodology, then review RDS/Cloud SQL/Azure SQL exposure, encryption at rest and in transit, authentication mechanisms, network access controls, and backup configurations.',
  },
  {
    name: "secrets-exposure",
    label: "Secrets Exposure",
    domain: "DATA",
    description: "Hardcoded credentials, env vars, secret sprawl, unrotated keys, CI/CD secrets",
    prompt: 'Run a secrets exposure assessment. Call _invoke_skill("secrets-exposure") to load the methodology, then scan for hardcoded credentials in code and configs, exposed environment variables, secret sprawl across services, unrotated API keys, and CI/CD pipeline secret exposure.',
  },
  {
    name: "secrets-manager-audit",
    label: "Secrets Manager",
    domain: "DATA",
    description: "AWS SM, Parameter Store, Azure Key Vault, GCP Secret Manager, rotation, logging",
    prompt: 'Audit secrets manager configurations. Call _invoke_skill("secrets-manager-audit") to load the methodology, then review AWS Secrets Manager, Parameter Store, Azure Key Vault, and GCP Secret Manager for rotation policies, access controls, and audit logging.',
  },

  // ── DIAGRAMS ───────────────────────────────────────────────────────────────
  {
    name: "mermaid",
    label: "Diagram / Report",
    domain: "DIAGRAMS",
    description: "Load the full Layer skeleton, mermaid syntax rules, validator, and forbidden headings before writing any _safe_page() report",
    prompt: 'Load the report and diagram methodology. Call _invoke_skill("mermaid") to load the full Layer skeleton, mermaid syntax rules, validator, and forbidden headings. Then write the report using _safe_page().',
  },

  // ── CHAIN ──────────────────────────────────────────────────────────────────
  {
    name: "supply-chain-integrity",
    label: "Supply Chain",
    domain: "CHAIN",
    description: "SBOM, artifact signing, CI/CD security, dependency vulns, build provenance",
    prompt: 'Assess software supply chain integrity. Call _invoke_skill("supply-chain-integrity") to load the methodology, then review SBOM coverage, artifact signing, CI/CD pipeline security, dependency vulnerability exposure, typosquatting risks, and build provenance.',
  },
  {
    name: "ssh-hardening",
    label: "SSH Hardening",
    domain: "CHAIN",
    description: "Config audit, password auth, root login, weak ciphers/KEX/MACs, bastion security",
    prompt: 'Run an SSH hardening assessment. Call _invoke_skill("ssh-hardening") to load the methodology, then audit SSH configurations for password authentication, root login, weak ciphers and KEX algorithms, key sprawl, and bastion host security.',
  },
  {
    name: "logging-audit",
    label: "Logging & Audit",
    domain: "CHAIN",
    description: "CloudTrail, CloudWatch, Azure Monitor, GCP Logging, SIEM, alert coverage gaps",
    prompt: 'Assess logging and audit trail coverage. Call _invoke_skill("logging-audit") to load the methodology, then review CloudTrail/CloudWatch/Azure Monitor/GCP Logging coverage, audit log integrity, SIEM integration, and alert coverage gaps.',
  },
  {
    name: "attack-chain-analysis",
    label: "Attack Chain",
    domain: "CHAIN",
    description: "Privilege escalation paths, lateral movement, blast radius, MITRE ATT&CK mapping",
    prompt: 'Run an attack chain analysis. Call _invoke_skill("attack-chain-analysis") to load the methodology, then trace privilege escalation paths, lateral movement vectors, blast radius from confirmed findings, and map the kill chain to MITRE ATT&CK techniques.',
  },
];

export function getSkillsByDomain(): Record<string, Skill[]> {
  const map: Record<string, Skill[]> = {};
  for (const d of SKILL_DOMAINS) map[d] = [];
  for (const s of SKILLS) {
    if (map[s.domain]) map[s.domain].push(s);
  }
  return map;
}

export function filterSkills(query: string): Skill[] {
  const q = query.toLowerCase();
  if (!q) return SKILLS;
  return SKILLS.filter(
    (s) =>
      s.name.includes(q) ||
      s.label.toLowerCase().includes(q) ||
      s.domain.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q),
  );
}

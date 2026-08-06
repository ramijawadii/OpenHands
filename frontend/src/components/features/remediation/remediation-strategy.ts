/**
 * Execution taxonomy — the two layers a remediation is classified by.
 *
 * **Category** is what the operator reads: nine ways a change can happen.
 * **Strategy** is what the executor dispatches on: the concrete mechanism.
 *
 * The split matters because the platform must never expose 44 strategies as a
 * flat choice — an operator picking between `IAC_PR` and `GITOPS_DEPLOYMENT`
 * is being asked an implementation question. They choose (or approve) a
 * category; the strategy is resolved from the target's management channel.
 *
 * Category is also the right axis for POLICY: "no Direct Configuration Change
 * in production" is a rule a human can write and audit. The equivalent written
 * against strategies would be a 20-item list that silently rots as strategies
 * are added.
 */

export type ExecutionCategory =
  | "Code Change"
  | "Direct Configuration Change"
  | "Software Patch"
  | "Runtime Operation"
  | "Identity Operation"
  | "Security Control"
  | "Lifecycle Operation"
  | "Governance Workflow"
  | "Preventive Control";

export interface StrategySpec {
  id: string;
  label: string;
  category: ExecutionCategory;
  purpose: string;
  targets: string;
  examples: string;
  /**
   * Does this strategy write to the estate?
   *
   * Governance strategies do not, which is why they can be authorized without
   * an approval gate — the same Read/Write distinction the approvals model
   * already uses, applied one layer up.
   */
  writes: boolean;
}

/** The complete strategy set. Order follows the source taxonomy. */
export const STRATEGIES: StrategySpec[] = [
  [
    "IAC_PR",
    "Code Change",
    "Modify source-of-truth infrastructure",
    "AWS, Azure, GCP infrastructure",
    "Terraform, Bicep, CloudFormation, Pulumi, CDK",
    true,
  ],
  [
    "GITOPS_DEPLOYMENT",
    "Code Change",
    "Deploy declarative infrastructure/application",
    "Kubernetes, Platform",
    "ArgoCD, Flux",
    true,
  ],
  [
    "PIPELINE_CONTROL",
    "Preventive Control",
    "Prevent deployment of insecure artifacts",
    "CI/CD",
    "GitHub Actions, Azure DevOps, Jenkins policy gates",
    true,
  ],
  [
    "POLICY_AS_CODE",
    "Preventive Control",
    "Prevent future violations",
    "Cloud Governance",
    "Azure Policy, AWS SCP, OPA, Kyverno, Gatekeeper",
    true,
  ],
  [
    "CLOUD_API",
    "Direct Configuration Change",
    "Direct cloud API modification",
    "Cloud resources",
    "AWS SDK, Azure SDK, GCP SDK",
    true,
  ],
  [
    "CLI_SCRIPT",
    "Direct Configuration Change",
    "CLI-based remediation",
    "Cloud resources",
    "AWS CLI, Azure CLI, gcloud, PowerShell",
    true,
  ],
  [
    "CONSOLE_MANUAL",
    "Direct Configuration Change",
    "Human portal changes",
    "Emergency/manual fixes",
    "AWS Console, Azure Portal, GCP Console",
    true,
  ],
  [
    "AUTOMATION_RUNBOOK",
    "Runtime Operation",
    "Automated operational workflow",
    "Repetitive deterministic fixes",
    "SSM Automation, Azure Automation, Lambda",
    true,
  ],
  [
    "PATCH_MANAGER",
    "Software Patch",
    "Install OS/application patches",
    "VMs, hybrid servers",
    "AWS Patch Manager, Azure Update Manager, SCCM, WSUS",
    true,
  ],
  [
    "CONFIGURATION_MANAGEMENT",
    "Direct Configuration Change",
    "Enforce desired host configuration",
    "Servers",
    "Ansible, Puppet, Chef, Salt",
    true,
  ],
  [
    "IMAGE_REBUILD",
    "Software Patch",
    "Replace vulnerable base image",
    "VM Images",
    "AMI baking, Azure Image Builder",
    true,
  ],
  [
    "CONTAINER_IMAGE_REBUILD",
    "Software Patch",
    "Rebuild vulnerable container",
    "Containers",
    "Docker build, BuildKit, Kaniko",
    true,
  ],
  [
    "CONTAINER_REDEPLOY",
    "Runtime Operation",
    "Replace running workload",
    "Kubernetes",
    "kubectl rollout, Deployment update",
    true,
  ],
  [
    "KUBERNETES_MANIFEST_UPDATE",
    "Code Change",
    "Modify workload configuration",
    "Kubernetes",
    "YAML, Helm, Kustomize",
    true,
  ],
  [
    "SERVERLESS_DEPLOYMENT",
    "Code Change",
    "Redeploy serverless configuration",
    "Lambda, Functions",
    "SAM, Serverless Framework, Terraform",
    true,
  ],
  [
    "IDENTITY_POLICY_UPDATE",
    "Identity Operation",
    "Modify IAM policies",
    "IAM",
    "AWS IAM, Entra ID, GCP IAM",
    true,
  ],
  [
    "ACCESS_REVIEW",
    "Identity Operation",
    "Human access approval/removal",
    "Identities",
    "Remove role, revoke group",
    true,
  ],
  [
    "SECRET_ROTATION",
    "Identity Operation",
    "Rotate credentials",
    "Secrets",
    "AWS Secrets Manager, Azure Key Vault",
    true,
  ],
  [
    "CERTIFICATE_ROTATION",
    "Security Control",
    "Renew/replace certificates",
    "PKI",
    "ACM, Key Vault Certificates",
    true,
  ],
  [
    "KEY_ROTATION",
    "Security Control",
    "Rotate encryption keys",
    "KMS/HSM",
    "AWS KMS, Azure Key Vault Keys",
    true,
  ],
  [
    "NETWORK_RECONFIGURATION",
    "Security Control",
    "Update network controls",
    "Network",
    "NSG, Security Groups, Firewall rules",
    true,
  ],
  [
    "DNS_CONFIGURATION",
    "Security Control",
    "Modify DNS posture",
    "DNS",
    "Route53, Azure DNS, Cloud DNS",
    true,
  ],
  [
    "WAF_RULE_UPDATE",
    "Security Control",
    "Update application protection",
    "WAF",
    "AWS WAF, Azure WAF, Cloud Armor",
    true,
  ],
  [
    "FIREWALL_POLICY_UPDATE",
    "Security Control",
    "Update firewall policies",
    "Network",
    "Palo Alto, Check Point, Fortinet",
    true,
  ],
  [
    "LOAD_BALANCER_UPDATE",
    "Security Control",
    "Update listener/security config",
    "LB",
    "ALB, NLB, Azure LB",
    true,
  ],
  [
    "STORAGE_CONFIGURATION",
    "Direct Configuration Change",
    "Secure storage",
    "Storage",
    "Block public access, encryption",
    true,
  ],
  [
    "DATABASE_CONFIGURATION",
    "Direct Configuration Change",
    "Secure DB settings",
    "Databases",
    "RDS, Azure SQL, Cloud SQL",
    true,
  ],
  [
    "BACKUP_CONFIGURATION",
    "Direct Configuration Change",
    "Enable/repair backup",
    "Backup",
    "AWS Backup, Azure Backup",
    true,
  ],
  [
    "MONITORING_CONFIGURATION",
    "Security Control",
    "Enable telemetry",
    "Observability",
    "CloudTrail, Azure Monitor, Config",
    true,
  ],
  [
    "AGENT_DEPLOYMENT",
    "Security Control",
    "Install security agents",
    "Hosts",
    "Defender, CrowdStrike, SentinelOne",
    true,
  ],
  [
    "SERVICE_RESTART",
    "Runtime Operation",
    "Restart workload",
    "Runtime",
    "VM, Pod, Service",
    true,
  ],
  [
    "RESOURCE_REDEPLOYMENT",
    "Runtime Operation",
    "Redeploy workload",
    "Runtime",
    "Recreate VM, App Service",
    true,
  ],
  [
    "RESOURCE_REPLACEMENT",
    "Lifecycle Operation",
    "Replace compromised resource",
    "Infrastructure",
    "Immutable replacement",
    true,
  ],
  [
    "RESOURCE_QUARANTINE",
    "Lifecycle Operation",
    "Isolate resource",
    "IR",
    "Network isolation, quarantine tag",
    true,
  ],
  [
    "RESOURCE_TERMINATION",
    "Lifecycle Operation",
    "Delete resource",
    "Infrastructure",
    "Terminate EC2, Delete VM",
    true,
  ],
  [
    "DRIFT_RECONCILIATION",
    "Lifecycle Operation",
    "Reconcile runtime with IaC",
    "Managed infrastructure",
    "Terraform Apply, Git reconciliation",
    true,
  ],
  [
    "ROLLBACK",
    "Lifecycle Operation",
    "Restore previous known-good state",
    "Application/Infra",
    "Previous release, previous image",
    true,
  ],
  [
    "CHANGE_REQUEST",
    "Governance Workflow",
    "Human approval before execution",
    "Enterprise ITSM",
    "CAB workflow",
    false,
  ],
  [
    "TICKET_ASSIGNMENT",
    "Governance Workflow",
    "Assign remediation work",
    "Manual process",
    "Jira, ServiceNow",
    false,
  ],
  [
    "EXCEPTION_REQUEST",
    "Governance Workflow",
    "Temporary waiver",
    "Governance",
    "Risk acceptance workflow",
    false,
  ],
  [
    "COMPENSATING_CONTROL",
    "Governance Workflow",
    "Mitigate instead of fixing",
    "Governance",
    "WAF rule instead of code fix",
    true,
  ],
  [
    "FALSE_POSITIVE_CLOSE",
    "Governance Workflow",
    "Close invalid finding",
    "Governance",
    "Detection tuning",
    false,
  ],
  [
    "SUPPRESSION_RULE",
    "Governance Workflow",
    "Prevent repeated noise",
    "Governance",
    "CNAPP suppression",
    false,
  ],
  [
    "NO_ACTION",
    "Governance Workflow",
    "Already compliant/not applicable",
    "Governance",
    "Duplicate, obsolete asset",
    false,
  ],
].map(([id, category, purpose, targets, examples, writes]) => ({
  id: id as string,
  label: (id as string).replace(/_/g, " ").toLowerCase(),
  category: category as ExecutionCategory,
  purpose: purpose as string,
  targets: targets as string,
  examples: examples as string,
  writes: writes as boolean,
}));

export const STRATEGY_BY_ID: Record<string, StrategySpec> = Object.fromEntries(
  STRATEGIES.map((s) => [s.id, s]),
);

/** Category → the strategies under it, for the category chip's tooltip. */
export function strategiesIn(category: ExecutionCategory): StrategySpec[] {
  return STRATEGIES.filter((s) => s.category === category);
}

/**
 * Category tone.
 *
 * Deliberately coarse: a Code Change and a Governance Workflow differ in kind,
 * and the colour should say which class of thing is about to happen, not
 * grade its severity — severity already has its own language on this surface.
 */
export const CATEGORY_TONE: Record<ExecutionCategory, string> = {
  "Code Change": "var(--cg-accent)",
  "Direct Configuration Change": "var(--cgx-high)",
  "Software Patch": "var(--cgx-compute)",
  "Runtime Operation": "var(--cgx-network)",
  "Identity Operation": "var(--cgx-account)",
  "Security Control": "var(--cgx-low)",
  "Lifecycle Operation": "var(--cgx-critical)",
  "Governance Workflow": "var(--cg-text-muted)",
  "Preventive Control": "var(--cgx-storage)",
};

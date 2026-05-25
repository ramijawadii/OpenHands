import React from "react";
import { CheckCircle2, Eye, Ban, ChevronDown } from "lucide-react";

const S = {
  textPrimary: "var(--cg-text-primary)",
  textSecondary: "var(--cg-text-nav)",
  textMuted: "var(--cg-text-muted)",
  border: "var(--cg-border)",
  borderStrong: "var(--cg-border-strong)",
  inputBg: "var(--cg-input-bg)",
  accent: "var(--cg-accent)",
  success: "#4caf7d",
  warning: "#e09a2d",
  danger: "var(--cg-danger)",
  cardBg: "var(--cg-bg-card)",
  navBg: "var(--cg-bg-primary-sidebar)",
  iconBg: "var(--cg-bg-active)",
} as const;

/* ─── Cloud provider SVG icons ─── */

function AwsIcon({ size = 20 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} xmlns="http://www.w3.org/2000/svg" style={{ display: "block" }}>
      <path fill="#fff" d="M6.763 11.212c0 .296.032.535.088.71.064.176.144.368.256.576.04.063.056.127.056.183 0 .08-.048.16-.152.24l-.503.335a.383.383 0 01-.208.072c-.08 0-.16-.04-.239-.112a2.47 2.47 0 01-.287-.375 6.18 6.18 0 01-.248-.471c-.622.734-1.405 1.101-2.347 1.101-.67 0-1.205-.191-1.596-.574-.39-.384-.59-.894-.59-1.533 0-.678.24-1.23.726-1.644.487-.415 1.133-.623 1.955-.623.272 0 .551.024.846.064.296.04.6.104.918.176v-.583c0-.607-.127-1.03-.375-1.277-.255-.248-.686-.367-1.3-.367-.28 0-.568.031-.863.103-.295.072-.583.16-.862.272a2.4 2.4 0 01-.28.104.488.488 0 01-.127.023c-.112 0-.168-.08-.168-.247v-.391c0-.128.016-.224.056-.28a.597.597 0 01.224-.167 4.577 4.577 0 011.005-.36 4.84 4.84 0 011.246-.151c.95 0 1.644.216 2.091.647.44.43.662 1.085.662 1.963v2.586h.016zm-3.24 1.214c.263 0 .534-.048.822-.144a1.78 1.78 0 00.758-.51 1.27 1.27 0 00.272-.512c.047-.191.08-.423.08-.694v-.335a6.66 6.66 0 00-.735-.136 6.02 6.02 0 00-.75-.048c-.535 0-.926.104-1.19.32-.263.215-.39.518-.39.917 0 .375.095.655.295.846.191.2.47.296.838.296zm6.41.862c-.144 0-.24-.024-.304-.08-.064-.048-.12-.16-.168-.311L7.586 6.726a1.398 1.398 0 01-.072-.32c0-.128.064-.2.191-.2h.783c.151 0 .255.025.31.08.065.048.113.16.16.312l1.342 5.284 1.245-5.284c.04-.16.088-.264.151-.312a.549.549 0 01.32-.08h.638c.152 0 .256.025.32.08.063.048.12.16.151.312l1.261 5.348 1.381-5.348c.048-.16.104-.264.16-.312a.52.52 0 01.311-.08h.743c.127 0 .2.065.2.2 0 .04-.009.08-.017.128a1.137 1.137 0 01-.056.2l-1.923 6.17c-.048.16-.104.263-.168.311a.51.51 0 01-.303.08h-.687c-.15 0-.255-.024-.32-.08-.063-.056-.119-.16-.15-.32L12.32 7.747l-1.23 5.14c-.04.16-.087.264-.15.32-.065.056-.177.08-.32.08l-.686.001zm10.256.215c-.415 0-.83-.048-1.229-.143-.399-.096-.71-.2-.918-.32-.128-.071-.215-.151-.247-.223a.563.563 0 01-.048-.224v-.407c0-.167.064-.247.183-.247.048 0 .096.008.144.024.048.016.12.048.2.08.271.12.566.215.878.279.32.064.63.096.95.096.502 0 .894-.088 1.165-.264a.86.86 0 00.415-.758.777.777 0 00-.215-.559c-.144-.151-.416-.287-.807-.415l-1.157-.36c-.583-.183-1.014-.454-1.277-.813a1.902 1.902 0 01-.4-1.158c0-.335.073-.63.216-.886.144-.255.335-.479.575-.654.24-.184.51-.32.83-.415.32-.096.655-.136 1.006-.136.175 0 .36.008.535.032.183.024.35.056.518.088.16.04.312.08.455.127.144.048.256.096.336.144a.69.69 0 01.24.2.43.43 0 01.071.263v.375c0 .168-.064.256-.184.256a.83.83 0 01-.303-.096 3.652 3.652 0 00-1.532-.311c-.455 0-.815.071-1.062.223-.248.152-.375.383-.375.71 0 .224.08.416.24.567.16.152.454.304.877.44l1.134.358c.574.184.99.44 1.237.767.247.327.367.702.367 1.117 0 .343-.072.655-.207.926a2.157 2.157 0 01-.583.703c-.248.2-.543.343-.886.447-.36.111-.734.167-1.142.167z" />
      <path d="M.378 15.475c3.384 1.963 7.56 3.153 11.877 3.153 2.914 0 6.114-.607 9.06-1.852.44-.2.814.287.383.607-2.626 1.94-6.442 2.969-9.722 2.969-4.598 0-8.74-1.7-11.87-4.526-.247-.223-.024-.527.272-.351zm23.531-.2c.287.36-.08 2.826-1.485 4.007-.215.184-.423.088-.327-.151l.175-.439c.343-.88.802-2.198.52-2.555-.336-.43-2.22-.207-3.074-.103-.255.032-.295-.192-.063-.36 1.5-1.053 3.967-.75 4.254-.399z" fill="#FF9900" />
    </svg>
  );
}

function AzureIcon({ size = 20, uid = "a" }: { size?: number; uid?: string }) {
  const g = (n: number) => `az_${uid}_${n}`;
  return (
    <svg viewBox="0 0 18 18" fill="none" width={size} height={size} xmlns="http://www.w3.org/2000/svg" style={{ display: "block" }}>
      <defs>
        <linearGradient id={g(0)} x1="6.075" y1="1.385" x2="0.738" y2="17.151" gradientUnits="userSpaceOnUse">
          <stop stopColor="#114A8B" /><stop offset="1" stopColor="#0669BC" />
        </linearGradient>
        <linearGradient id={g(1)} x1="10.34" y1="11.456" x2="9.107" y2="11.873" gradientUnits="userSpaceOnUse">
          <stop stopOpacity="0.3" /><stop offset="0.071" stopOpacity="0.2" /><stop offset="0.321" stopOpacity="0.1" /><stop offset="0.623" stopOpacity="0.05" /><stop offset="1" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={g(2)} x1="9.459" y1="1.385" x2="15.317" y2="16.993" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3CCBF4" /><stop offset="1" stopColor="#2892DF" />
        </linearGradient>
      </defs>
      <path d="M5.335 1.375C5.447 1.042 5.759.818 6.11.818H11.25L5.915 16.626c-.112.332-.424.556-.775.556H1.14c-.56 0-.954-.55-.775-1.08L5.335 1.375z" fill={`url(#${g(0)})`} />
      <path d="M13.552 11.455H5.451c-.34 0-.506.417-.254.649l5.205 4.858c.152.142.351.22.558.22h4.587l-1.995-5.727z" fill="#0078D4" />
      <path d="M6.11.818c-.35 0-.663.224-.775.557L.364 16.102c-.179.53.215 1.08.775 1.08H5.14c.35 0 .663-.224.775-.556L6.903 13.7l3.498 3.264c.15.141.35.22.558.22h4.586l-1.993-5.728H7.66L11.25.818H6.11z" fill={`url(#${g(1)})`} />
      <path d="M12.665 1.375c-.112-.333-.424-.557-.775-.557H6.136h.027c.35 0 .663.224.775.557l4.97 14.727c.18.531-.214 1.08-.775 1.08h-.087H16.86c.56 0 .954-.55.775-1.08L12.665 1.375z" fill={`url(#${g(2)})`} />
    </svg>
  );
}

function GcpIcon({ size = 20 }: { size?: number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} xmlns="http://www.w3.org/2000/svg" style={{ display: "block" }}>
      <path d="M40.728 20.488l2.05.035 5.57-5.57.27-2.36C44.2 8.657 38.367 6.26 31.993 6.26c-11.54 0-21.28 7.852-24.163 18.488.608-.424 1.908-.106 1.908-.106l11.13-1.83s.572-.947.862-.9A13.88 13.88 0 0132 17.375c3.3.007 6.34 1.173 8.728 3.102z" fill="#ea4335" />
      <path d="M56.17 24.77c-1.293-4.77-3.958-8.982-7.555-12.177l-7.887 7.887c3.16 2.55 5.187 6.452 5.187 10.82v1.392c3.837 0 6.954 3.124 6.954 6.954 0 3.837-3.124 6.954-6.954 6.954H32.007L30.615 48v8.346l1.392 1.385h13.908A18.11 18.11 0 0064 39.647c-.007-6.155-3.1-11.6-7.83-14.876z" fill="#4285f4" />
      <path d="M18.085 57.74h13.9V46.6h-13.9a6.89 6.89 0 01-2.862-.622l-2.007.615-5.57 5.57-.488 1.88a18 18 0 0010.926 3.689z" fill="#34a853" />
      <path d="M18.085 21.57A18.11 18.11 0 000 39.654c0 5.873 2.813 11.095 7.166 14.403l8.064-8.064a6.96 6.96 0 01-4.099-6.339c0-3.837 3.124-6.954 6.954-6.954 2.82 0 5.244 1.7 6.34 4.1l8.064-8.064c-3.307-4.353-8.53-7.166-14.403-7.166z" fill="#fbbc05" />
    </svg>
  );
}

function CloudIcon({ cloud, size = 20, uid }: { cloud: string; size?: number; uid?: string }) {
  if (cloud === "AWS") return <AwsIcon size={size} />;
  if (cloud === "Azure") return <AzureIcon size={size} uid={uid} />;
  return <GcpIcon size={size} />;
}

/* ─── Types ─── */

type PermState = "allow" | "ask" | "never";
type OpType = "READ" | "WRITE";
type Risk = "LOW" | "MEDIUM" | "HIGH";

interface Op { key: string; label: string; action: string; opType: OpType; risk: Risk; defaultState: PermState; }
interface CnappLayer { num: number; title: string; subtitle: string; ops: Op[]; }
interface Permission { key: string; label: string; sublabel?: string; state: PermState; }
interface PermGroup { title: string; sublabel: string; permissions: Permission[]; }
interface Account { id: string; label: string; region?: string; status: "active" | "inactive"; }
interface Connector {
  id: string; name: string; cloud: string; status: "connected" | "error" | "paused";
  description: string;
  cnappLayers?: CnappLayer[];
  permGroups?: PermGroup[];
  credential: { type: string; label: string; fields: { label: string; value: string; masked: boolean }[] };
  accounts: Account[];
}

/* ─── Data helpers ─── */

const ds = (t: OpType, r: Risk): PermState =>
  t === "READ" ? "allow" : r === "HIGH" ? "never" : r === "MEDIUM" ? "ask" : "allow";

function mkOps(layerNum: number, raw: [string, string, OpType, Risk][]): Op[] {
  return raw.map(([label, action, opType, risk], i) => ({
    key: `${layerNum}_${i}`, label, action, opType, risk, defaultState: ds(opType, risk),
  }));
}

/* ─── AWS CNAPP Layers Data ─── */

const AWS_LAYERS: CnappLayer[] = [
  {
    num: 1, title: "Identity & Access (CIEM)",
    subtitle: "IAM users, roles, groups, MFA, access keys, SCPs, federated identity, privilege escalation",
    ops: mkOps(1, [
      ["List all IAM users", "iam:ListUsers", "READ", "LOW"],
      ["Get user details", "iam:GetUser", "READ", "LOW"],
      ["List user groups", "iam:ListGroupsForUser", "READ", "LOW"],
      ["List all IAM groups", "iam:ListGroups", "READ", "LOW"],
      ["Get group policy", "iam:GetGroupPolicy", "READ", "LOW"],
      ["List group policies", "iam:ListGroupPolicies", "READ", "LOW"],
      ["List attached group policies", "iam:ListAttachedGroupPolicies", "READ", "LOW"],
      ["List IAM roles", "iam:ListRoles", "READ", "LOW"],
      ["Get role", "iam:GetRole", "READ", "LOW"],
      ["List role policies", "iam:ListRolePolicies", "READ", "LOW"],
      ["List attached role policies", "iam:ListAttachedRolePolicies", "READ", "LOW"],
      ["Get policy", "iam:GetPolicy", "READ", "LOW"],
      ["Get policy version", "iam:GetPolicyVersion", "READ", "LOW"],
      ["List all policies", "iam:ListPolicies", "READ", "LOW"],
      ["List access keys", "iam:ListAccessKeys", "READ", "LOW"],
      ["Get access key last used", "iam:GetAccessKeyLastUsed", "READ", "LOW"],
      ["Get account password policy", "iam:GetAccountPasswordPolicy", "READ", "LOW"],
      ["Get account summary", "iam:GetAccountSummary", "READ", "LOW"],
      ["List MFA devices", "iam:ListMFADevices", "READ", "LOW"],
      ["List virtual MFA devices", "iam:ListVirtualMFADevices", "READ", "LOW"],
      ["Get login profile", "iam:GetLoginProfile", "READ", "LOW"],
      ["List account aliases", "iam:ListAccountAliases", "READ", "LOW"],
      ["Generate credential report", "iam:GenerateCredentialReport", "READ", "LOW"],
      ["Get credential report", "iam:GetCredentialReport", "READ", "LOW"],
      ["List SAML providers", "iam:ListSAMLProviders", "READ", "LOW"],
      ["List OIDC providers", "iam:ListOpenIDConnectProviders", "READ", "LOW"],
      ["Get SAML provider", "iam:GetSAMLProvider", "READ", "LOW"],
      ["List instance profiles", "iam:ListInstanceProfiles", "READ", "LOW"],
      ["Get account authorization details", "iam:GetAccountAuthorizationDetails", "READ", "MEDIUM"],
      ["List policy versions", "iam:ListPolicyVersions", "READ", "LOW"],
      ["Simulate principal policy", "iam:SimulatePrincipalPolicy", "READ", "MEDIUM"],
      ["Access Analyzer — list analyzers", "access-analyzer:ListAnalyzers", "READ", "LOW"],
      ["Access Analyzer — list findings", "access-analyzer:ListFindings", "READ", "LOW"],
      ["Access Analyzer — get finding", "access-analyzer:GetFinding", "READ", "LOW"],
      ["Access Analyzer — list access previews", "access-analyzer:ListAccessPreviews", "READ", "LOW"],
      ["SSO — list account assignments", "sso:ListAccountAssignments", "READ", "LOW"],
      ["SSO — list permission sets", "sso:ListPermissionSets", "READ", "LOW"],
      ["Organizations — list accounts", "organizations:ListAccounts", "READ", "LOW"],
      ["Organizations — describe policy", "organizations:DescribePolicy", "READ", "LOW"],
      ["Organizations — list policies", "organizations:ListPolicies", "READ", "LOW"],
      ["Create IAM policy", "iam:CreatePolicy", "WRITE", "HIGH"],
      ["Attach role policy", "iam:AttachRolePolicy", "WRITE", "HIGH"],
      ["Detach role policy", "iam:DetachRolePolicy", "WRITE", "HIGH"],
      ["Delete access key", "iam:DeleteAccessKey", "WRITE", "HIGH"],
      ["Update access key (rotate)", "iam:UpdateAccessKey", "WRITE", "HIGH"],
      ["Deactivate MFA device", "iam:DeactivateMFADevice", "WRITE", "HIGH"],
      ["Update login profile", "iam:UpdateLoginProfile", "WRITE", "HIGH"],
      ["Create Access Analyzer", "access-analyzer:CreateAnalyzer", "WRITE", "MEDIUM"],
      ["Apply archive rule", "access-analyzer:ApplyArchiveRule", "WRITE", "MEDIUM"],
    ]),
  },
  {
    num: 2, title: "Non-Human Identity (NHI)",
    subtitle: "Service accounts, API tokens, workload identities, AI agent credentials, IRSA, OIDC",
    ops: mkOps(2, [
      ["List all roles (service-use)", "iam:ListRoles", "READ", "LOW"],
      ["Get role trust policy", "iam:GetRole", "READ", "LOW"],
      ["List instance profiles", "iam:ListInstanceProfiles", "READ", "LOW"],
      ["Get instance profile", "iam:GetInstanceProfile", "READ", "LOW"],
      ["List Lambda function configs", "lambda:ListFunctions", "READ", "LOW"],
      ["Get Lambda function policy", "lambda:GetPolicy", "READ", "LOW"],
      ["List ECS task definitions", "ecs:ListTaskDefinitions", "READ", "LOW"],
      ["Describe ECS task definition", "ecs:DescribeTaskDefinition", "READ", "LOW"],
      ["List EKS clusters", "eks:ListClusters", "READ", "LOW"],
      ["Describe EKS cluster (IRSA)", "eks:DescribeCluster", "READ", "LOW"],
      ["List Secrets Manager secrets", "secretsmanager:ListSecrets", "READ", "LOW"],
      ["Describe Secrets Manager secret", "secretsmanager:DescribeSecret", "READ", "LOW"],
      ["List SSM parameters (names only)", "ssm:DescribeParameters", "READ", "LOW"],
      ["List CodeBuild projects", "codebuild:ListProjects", "READ", "LOW"],
      ["Batch get CodeBuild projects", "codebuild:BatchGetProjects", "READ", "MEDIUM"],
      ["List CodePipeline pipelines", "codepipeline:ListPipelines", "READ", "LOW"],
      ["List Bedrock model invocation access", "bedrock:ListFoundationModels", "READ", "LOW"],
      ["List SageMaker execution roles", "sagemaker:ListDomains", "READ", "LOW"],
      ["Rotate secret", "secretsmanager:RotateSecret", "WRITE", "MEDIUM"],
      ["Delete secret", "secretsmanager:DeleteSecret", "WRITE", "HIGH"],
      ["Update secret (value)", "secretsmanager:PutSecretValue", "WRITE", "HIGH"],
      ["Update role trust policy", "iam:UpdateAssumeRolePolicy", "WRITE", "HIGH"],
    ]),
  },
  {
    num: 3, title: "Posture & Config (CSPM)",
    subtitle: "Misconfiguration, drift detection, asset inventory, secure score, Config rules, Security Hub",
    ops: mkOps(3, [
      ["List Config rules", "config:DescribeConfigRules", "READ", "LOW"],
      ["Get Config rule compliance", "config:DescribeComplianceByConfigRule", "READ", "LOW"],
      ["Get resource compliance", "config:DescribeComplianceByResource", "READ", "LOW"],
      ["List Config recorders", "config:DescribeConfigurationRecorders", "READ", "LOW"],
      ["Get resource config history", "config:GetResourceConfigHistory", "READ", "LOW"],
      ["List discovered resources", "config:ListDiscoveredResources", "READ", "LOW"],
      ["Get resource config snapshot", "config:GetResourceConfig", "READ", "LOW"],
      ["Describe delivery channels", "config:DescribeDeliveryChannels", "READ", "LOW"],
      ["Get Security Hub standards controls", "securityhub:DescribeStandardsControls", "READ", "LOW"],
      ["List Security Hub findings", "securityhub:GetFindings", "READ", "LOW"],
      ["Describe Security Hub hub", "securityhub:DescribeHub", "READ", "LOW"],
      ["List Security Hub members", "securityhub:ListMembers", "READ", "LOW"],
      ["Get Security Hub enabled standards", "securityhub:GetEnabledStandards", "READ", "LOW"],
      ["Describe Trusted Advisor checks", "support:DescribeTrustedAdvisorChecks", "READ", "LOW"],
      ["Get Trusted Advisor check result", "support:DescribeTrustedAdvisorCheckResult", "READ", "LOW"],
      ["Describe EC2 instances", "ec2:DescribeInstances", "READ", "LOW"],
      ["Describe VPCs", "ec2:DescribeVpcs", "READ", "LOW"],
      ["Describe subnets", "ec2:DescribeSubnets", "READ", "LOW"],
      ["Describe security groups", "ec2:DescribeSecurityGroups", "READ", "LOW"],
      ["Describe internet gateways", "ec2:DescribeInternetGateways", "READ", "LOW"],
      ["Describe route tables", "ec2:DescribeRouteTables", "READ", "LOW"],
      ["List S3 buckets", "s3:ListAllMyBuckets", "READ", "LOW"],
      ["Get S3 bucket policy", "s3:GetBucketPolicy", "READ", "LOW"],
      ["Get S3 bucket ACL", "s3:GetBucketAcl", "READ", "LOW"],
      ["Get S3 public access block", "s3:GetBucketPublicAccessBlock", "READ", "LOW"],
      ["Get S3 encryption", "s3:GetEncryptionConfiguration", "READ", "LOW"],
      ["Get S3 versioning", "s3:GetBucketVersioning", "READ", "LOW"],
      ["Get S3 logging", "s3:GetBucketLogging", "READ", "LOW"],
      ["List CloudTrail trails", "cloudtrail:DescribeTrails", "READ", "LOW"],
      ["Get CloudTrail status", "cloudtrail:GetTrailStatus", "READ", "LOW"],
      ["Describe RDS instances", "rds:DescribeDBInstances", "READ", "LOW"],
      ["Describe RDS clusters", "rds:DescribeDBClusters", "READ", "LOW"],
      ["List KMS keys", "kms:ListKeys", "READ", "LOW"],
      ["Describe KMS key", "kms:DescribeKey", "READ", "LOW"],
      ["Get KMS key policy", "kms:GetKeyPolicy", "READ", "LOW"],
      ["Describe ElasticSearch/OpenSearch", "es:DescribeElasticsearchDomains", "READ", "LOW"],
      ["Describe ELBv2 load balancers", "elasticloadbalancing:DescribeLoadBalancers", "READ", "LOW"],
      ["Enable Security Hub", "securityhub:EnableSecurityHub", "WRITE", "MEDIUM"],
      ["Update Security Hub finding", "securityhub:UpdateFindings", "WRITE", "MEDIUM"],
      ["Put Config rule", "config:PutConfigRule", "WRITE", "MEDIUM"],
      ["Start Config recorder", "config:StartConfigurationRecorder", "WRITE", "MEDIUM"],
      ["Put S3 public access block", "s3:PutBucketPublicAccessBlock", "WRITE", "HIGH"],
      ["Put S3 bucket policy", "s3:PutBucketPolicy", "WRITE", "HIGH"],
    ]),
  },
  {
    num: 4, title: "Compliance & Governance",
    subtitle: "CIS, NIST, PCI-DSS, HIPAA, SOC2, ISO 27001 — Audit Manager, Conformance Packs, Artifact",
    ops: mkOps(4, [
      ["List Audit Manager assessments", "auditmanager:ListAssessments", "READ", "LOW"],
      ["Get Audit Manager assessment", "auditmanager:GetAssessment", "READ", "LOW"],
      ["List Audit Manager frameworks", "auditmanager:ListAssessmentFrameworks", "READ", "LOW"],
      ["List Audit Manager controls", "auditmanager:ListControls", "READ", "LOW"],
      ["Get Audit Manager evidence", "auditmanager:GetEvidenceFolder", "READ", "LOW"],
      ["List Security Hub standards", "securityhub:DescribeStandards", "READ", "LOW"],
      ["Get Config compliance timeline", "config:GetComplianceDetailsByConfigRule", "READ", "LOW"],
      ["List Conformance Packs", "config:DescribeConformancePacks", "READ", "LOW"],
      ["Get Conformance Pack compliance", "config:GetConformancePackComplianceSummary", "READ", "LOW"],
      ["Describe Config aggregators", "config:DescribeConfigurationAggregators", "READ", "LOW"],
      ["List AWS Artifact agreements", "aws-artifact:ListAgreements", "READ", "LOW"],
      ["Create Audit Manager assessment", "auditmanager:CreateAssessment", "WRITE", "MEDIUM"],
      ["Create Conformance Pack", "config:PutConformancePack", "WRITE", "MEDIUM"],
      ["Enable Security Hub standard", "securityhub:BatchEnableStandards", "WRITE", "MEDIUM"],
    ]),
  },
  {
    num: 5, title: "Workload Protection (CWPP)",
    subtitle: "VMs, serverless, vulnerability scanning, runtime defense, malware, patch compliance",
    ops: mkOps(5, [
      ["List Inspector findings", "inspector2:ListFindings", "READ", "LOW"],
      ["Get Inspector finding", "inspector2:GetFinding", "READ", "LOW"],
      ["List Inspector coverage", "inspector2:ListCoverage", "READ", "LOW"],
      ["Get Inspector status", "inspector2:BatchGetAccountStatus", "READ", "LOW"],
      ["List Inspector delegated admins", "inspector2:ListDelegatedAdminAccounts", "READ", "LOW"],
      ["Describe EC2 instances", "ec2:DescribeInstances", "READ", "LOW"],
      ["Describe images (AMIs)", "ec2:DescribeImages", "READ", "LOW"],
      ["Describe EC2 tags", "ec2:DescribeTags", "READ", "LOW"],
      ["List Lambda functions", "lambda:ListFunctions", "READ", "LOW"],
      ["Get Lambda function policy", "lambda:GetPolicy", "READ", "LOW"],
      ["List Lambda layers", "lambda:ListLayers", "READ", "LOW"],
      ["List SSM managed instances", "ssm:DescribeInstanceInformation", "READ", "LOW"],
      ["Get SSM compliance summary", "ssm:ListComplianceSummaries", "READ", "LOW"],
      ["Get SSM patch baseline", "ssm:DescribePatchBaselines", "READ", "LOW"],
      ["Get SSM patch compliance", "ssm:DescribeInstancePatchStates", "READ", "LOW"],
      ["List SSM inventory", "ssm:GetInventory", "READ", "LOW"],
      ["List GuardDuty EC2 findings", "guardduty:ListFindings", "READ", "LOW"],
      ["Get GuardDuty finding (malware)", "guardduty:GetFindings", "READ", "LOW"],
      ["List ECS tasks", "ecs:ListTasks", "READ", "LOW"],
      ["Describe ECS tasks", "ecs:DescribeTasks", "READ", "LOW"],
      ["Run SSM command (patching)", "ssm:SendCommand", "WRITE", "HIGH"],
      ["Create SSM patch baseline", "ssm:CreatePatchBaseline", "WRITE", "MEDIUM"],
      ["Terminate EC2 instance", "ec2:TerminateInstances", "WRITE", "HIGH"],
      ["Stop EC2 instance", "ec2:StopInstances", "WRITE", "HIGH"],
      ["Enable Inspector", "inspector2:Enable", "WRITE", "MEDIUM"],
      ["Archive Inspector finding", "inspector2:BatchUpdateFindings", "WRITE", "MEDIUM"],
      ["Archive GuardDuty finding", "guardduty:ArchiveFindings", "WRITE", "MEDIUM"],
    ]),
  },
  {
    num: 6, title: "Containers & Kubernetes (KSPM)",
    subtitle: "EKS cluster posture, ECR image scanning, ECS task definitions, registry security",
    ops: mkOps(6, [
      ["List EKS clusters", "eks:ListClusters", "READ", "LOW"],
      ["Describe EKS cluster", "eks:DescribeCluster", "READ", "LOW"],
      ["List EKS nodegroups", "eks:ListNodegroups", "READ", "LOW"],
      ["Describe EKS nodegroup", "eks:DescribeNodegroup", "READ", "LOW"],
      ["List EKS addons", "eks:ListAddons", "READ", "LOW"],
      ["Describe EKS addon", "eks:DescribeAddon", "READ", "LOW"],
      ["List ECR repositories", "ecr:DescribeRepositories", "READ", "LOW"],
      ["Describe ECR images", "ecr:DescribeImages", "READ", "LOW"],
      ["Get ECR image scan findings", "ecr:DescribeImageScanFindings", "READ", "LOW"],
      ["Get ECR repository policy", "ecr:GetRepositoryPolicy", "READ", "LOW"],
      ["Get ECR lifecycle policy", "ecr:GetLifecyclePolicy", "READ", "LOW"],
      ["Describe ECS clusters", "ecs:DescribeClusters", "READ", "LOW"],
      ["List ECS task definitions", "ecs:ListTaskDefinitions", "READ", "LOW"],
      ["GuardDuty EKS findings", "guardduty:ListFindings", "READ", "LOW"],
      ["Inspector container findings", "inspector2:ListFindings", "READ", "LOW"],
      ["Start ECR image scan", "ecr:StartImageScan", "WRITE", "LOW"],
      ["Put ECR lifecycle policy", "ecr:PutLifecyclePolicy", "WRITE", "MEDIUM"],
      ["Delete ECR image", "ecr:BatchDeleteImage", "WRITE", "HIGH"],
      ["Update EKS cluster config", "eks:UpdateClusterConfig", "WRITE", "HIGH"],
    ]),
  },
  {
    num: 7, title: "Network Security",
    subtitle: "VPC, security groups, NACLs, WAF, Shield, Network Firewall, flow logs, Route53",
    ops: mkOps(7, [
      ["Describe VPCs", "ec2:DescribeVpcs", "READ", "LOW"],
      ["Describe subnets", "ec2:DescribeSubnets", "READ", "LOW"],
      ["Describe security groups", "ec2:DescribeSecurityGroups", "READ", "LOW"],
      ["Describe NACLs", "ec2:DescribeNetworkAcls", "READ", "LOW"],
      ["Describe route tables", "ec2:DescribeRouteTables", "READ", "LOW"],
      ["Describe internet gateways", "ec2:DescribeInternetGateways", "READ", "LOW"],
      ["Describe NAT gateways", "ec2:DescribeNatGateways", "READ", "LOW"],
      ["Describe VPN connections", "ec2:DescribeVpnConnections", "READ", "LOW"],
      ["Describe VPC peering", "ec2:DescribeVpcPeeringConnections", "READ", "LOW"],
      ["Describe VPC endpoints", "ec2:DescribeVpcEndpoints", "READ", "LOW"],
      ["Describe Transit Gateways", "ec2:DescribeTransitGateways", "READ", "LOW"],
      ["Describe network interfaces", "ec2:DescribeNetworkInterfaces", "READ", "LOW"],
      ["Describe ELBv2 load balancers", "elasticloadbalancing:DescribeLoadBalancers", "READ", "LOW"],
      ["Describe ELB listeners", "elasticloadbalancing:DescribeListeners", "READ", "LOW"],
      ["Describe ELB target groups", "elasticloadbalancing:DescribeTargetGroups", "READ", "LOW"],
      ["List WAF web ACLs", "wafv2:ListWebACLs", "READ", "LOW"],
      ["Get WAF web ACL", "wafv2:GetWebACL", "READ", "LOW"],
      ["Describe Network Firewall", "network-firewall:DescribeFirewall", "READ", "LOW"],
      ["Describe Shield subscription", "shield:DescribeSubscription", "READ", "LOW"],
      ["Describe Shield attacks", "shield:ListAttacks", "READ", "LOW"],
      ["Get VPC flow log config", "ec2:DescribeFlowLogs", "READ", "LOW"],
      ["List Route53 hosted zones", "route53:ListHostedZones", "READ", "LOW"],
      ["Create/modify security group rule", "ec2:AuthorizeSecurityGroupIngress", "WRITE", "HIGH"],
      ["Revoke security group rule", "ec2:RevokeSecurityGroupIngress", "WRITE", "HIGH"],
      ["Create VPC flow log", "ec2:CreateFlowLogs", "WRITE", "MEDIUM"],
      ["Create network ACL rule", "ec2:CreateNetworkAclEntry", "WRITE", "HIGH"],
      ["Update WAF web ACL", "wafv2:UpdateWebACL", "WRITE", "HIGH"],
    ]),
  },
  {
    num: 8, title: "Threat Detection (CDR)",
    subtitle: "GuardDuty, Detective, CloudWatch alerts, log analytics, threat intelligence",
    ops: mkOps(8, [
      ["List GuardDuty detectors", "guardduty:ListDetectors", "READ", "LOW"],
      ["Get GuardDuty detector", "guardduty:GetDetector", "READ", "LOW"],
      ["List GuardDuty findings", "guardduty:ListFindings", "READ", "LOW"],
      ["Get GuardDuty findings", "guardduty:GetFindings", "READ", "LOW"],
      ["List GuardDuty threat intel sets", "guardduty:ListThreatIntelSets", "READ", "LOW"],
      ["Get GuardDuty threat intel set", "guardduty:GetThreatIntelSet", "READ", "LOW"],
      ["List GuardDuty IP sets", "guardduty:ListIPSets", "READ", "LOW"],
      ["Get GuardDuty usage stats", "guardduty:GetUsageStatistics", "READ", "LOW"],
      ["List GuardDuty members", "guardduty:ListMembers", "READ", "LOW"],
      ["Search Detective graph", "detective:SearchGraph", "READ", "MEDIUM"],
      ["Get Detective members", "detective:ListMembers", "READ", "LOW"],
      ["List Detective investigations", "detective:ListInvestigations", "READ", "LOW"],
      ["List CloudWatch alarms", "cloudwatch:DescribeAlarms", "READ", "LOW"],
      ["Filter CloudWatch log events", "logs:FilterLogEvents", "READ", "LOW"],
      ["Describe CloudWatch log groups", "logs:DescribeLogGroups", "READ", "LOW"],
      ["List Security Hub findings", "securityhub:GetFindings", "READ", "LOW"],
      ["Archive GuardDuty finding", "guardduty:ArchiveFindings", "WRITE", "MEDIUM"],
      ["Create GuardDuty threat intel set", "guardduty:CreateThreatIntelSet", "WRITE", "MEDIUM"],
      ["Enable GuardDuty", "guardduty:CreateDetector", "WRITE", "MEDIUM"],
      ["Create CloudWatch alarm", "cloudwatch:PutMetricAlarm", "WRITE", "MEDIUM"],
      ["Create Detective graph", "detective:CreateGraph", "WRITE", "MEDIUM"],
    ]),
  },
  {
    num: 9, title: "IaC & DevSecOps",
    subtitle: "CloudFormation, CodePipeline, CodeBuild, CodeArtifact — template scanning, CI/CD gates",
    ops: mkOps(9, [
      ["List CloudFormation stacks", "cloudformation:ListStacks", "READ", "LOW"],
      ["Describe CloudFormation stacks", "cloudformation:DescribeStacks", "READ", "LOW"],
      ["Get CloudFormation template", "cloudformation:GetTemplate", "READ", "MEDIUM"],
      ["List CloudFormation change sets", "cloudformation:ListChangeSets", "READ", "LOW"],
      ["Describe CloudFormation change set", "cloudformation:DescribeChangeSet", "READ", "LOW"],
      ["List CodePipeline pipelines", "codepipeline:ListPipelines", "READ", "LOW"],
      ["Get CodePipeline pipeline", "codepipeline:GetPipeline", "READ", "LOW"],
      ["Get CodePipeline pipeline state", "codepipeline:GetPipelineState", "READ", "LOW"],
      ["List CodeBuild projects", "codebuild:ListProjects", "READ", "LOW"],
      ["Batch get CodeBuild projects", "codebuild:BatchGetProjects", "READ", "MEDIUM"],
      ["List CodeBuild builds", "codebuild:ListBuildsForProject", "READ", "LOW"],
      ["Get CodeBuild build", "codebuild:BatchGetBuilds", "READ", "LOW"],
      ["List CodeArtifact domains", "codeartifact:ListDomains", "READ", "LOW"],
      ["List CodeArtifact repositories", "codeartifact:ListRepositories", "READ", "LOW"],
      ["Update CloudFormation stack", "cloudformation:UpdateStack", "WRITE", "HIGH"],
      ["Delete CloudFormation stack", "cloudformation:DeleteStack", "WRITE", "HIGH"],
      ["Start CodePipeline execution", "codepipeline:StartPipelineExecution", "WRITE", "MEDIUM"],
      ["Start CodeBuild build", "codebuild:StartBuild", "WRITE", "MEDIUM"],
    ]),
  },
  {
    num: 10, title: "Supply Chain & SBOM",
    subtitle: "ECR image scanning, CodeArtifact packages, AWS Signer — SBOM generation, SLSA provenance",
    ops: mkOps(10, [
      ["List ECR repositories", "ecr:DescribeRepositories", "READ", "LOW"],
      ["Describe ECR images (digests, tags)", "ecr:DescribeImages", "READ", "LOW"],
      ["Get ECR image scan findings (SCA)", "ecr:DescribeImageScanFindings", "READ", "LOW"],
      ["List CodeArtifact packages", "codeartifact:ListPackages", "READ", "LOW"],
      ["Get CodeArtifact package version", "codeartifact:DescribePackageVersion", "READ", "LOW"],
      ["List CodeArtifact package version assets", "codeartifact:ListPackageVersionAssets", "READ", "LOW"],
      ["Get CodeArtifact domain policy", "codeartifact:GetDomainPermissionsPolicy", "READ", "LOW"],
      ["Inspector SBOM export findings", "inspector2:ListFindings", "READ", "LOW"],
      ["Get AWS Signer signing profiles", "signer:ListSigningProfiles", "READ", "LOW"],
      ["Get AWS Signer signing jobs", "signer:ListSigningJobs", "READ", "LOW"],
      ["Start ECR image scan", "ecr:StartImageScan", "WRITE", "LOW"],
      ["Put CodeArtifact package origin config", "codeartifact:PutPackageOriginConfiguration", "WRITE", "MEDIUM"],
      ["Start signing job", "signer:StartSigningJob", "WRITE", "MEDIUM"],
      ["Cancel signing job", "signer:CancelSigningJob", "WRITE", "LOW"],
    ]),
  },
  {
    num: 11, title: "Secrets Detection",
    subtitle: "Secrets Manager, Macie sensitive data, SSM parameters, CodeGuru, KMS key metadata",
    ops: mkOps(11, [
      ["List Secrets Manager secrets", "secretsmanager:ListSecrets", "READ", "LOW"],
      ["Describe secret (metadata only)", "secretsmanager:DescribeSecret", "READ", "LOW"],
      ["List secret version IDs", "secretsmanager:ListSecretVersionIds", "READ", "LOW"],
      ["Get Macie findings", "macie2:GetFindings", "READ", "LOW"],
      ["List Macie findings (sensitive data)", "macie2:ListFindings", "READ", "LOW"],
      ["Describe Macie classification jobs", "macie2:ListClassificationJobs", "READ", "LOW"],
      ["List SSM parameter names", "ssm:DescribeParameters", "READ", "LOW"],
      ["List CodeGuru reviewer recommendations", "codeguru-reviewer:ListRecommendations", "READ", "LOW"],
      ["List GuardDuty findings (credential exfil)", "guardduty:ListFindings", "READ", "LOW"],
      ["Get KMS key metadata", "kms:DescribeKey", "READ", "LOW"],
      ["Rotate Secrets Manager secret", "secretsmanager:RotateSecret", "WRITE", "MEDIUM"],
      ["Delete Secrets Manager secret", "secretsmanager:DeleteSecret", "WRITE", "HIGH"],
      ["Put Secrets Manager secret value", "secretsmanager:PutSecretValue", "WRITE", "HIGH"],
      ["Delete SSM parameter", "ssm:DeleteParameter", "WRITE", "HIGH"],
      ["Create Macie classification job", "macie2:CreateClassificationJob", "WRITE", "MEDIUM"],
    ]),
  },
  {
    num: 12, title: "API Security",
    subtitle: "API Gateway inventory, WAF associations, CloudFront, GuardDuty API findings, L7 listeners",
    ops: mkOps(12, [
      ["Get API Gateway REST APIs", "apigateway:GET /restapis", "READ", "LOW"],
      ["Get API Gateway stages", "apigateway:GET /restapis/{id}/stages", "READ", "LOW"],
      ["Get API Gateway authorizers", "apigateway:GET /restapis/{id}/authorizers", "READ", "LOW"],
      ["Get API Gateway usage plans", "apigateway:GET /usageplans", "READ", "LOW"],
      ["Get API Gateway v2 APIs", "apigateway:GET /v2/apis", "READ", "LOW"],
      ["Get API Gateway v2 routes", "apigateway:GET /v2/apis/{id}/routes", "READ", "LOW"],
      ["List WAF web ACL associations", "wafv2:GetWebACLForResource", "READ", "LOW"],
      ["Get WAF rule groups", "wafv2:ListRuleGroups", "READ", "LOW"],
      ["Get CloudFront distributions", "cloudfront:ListDistributions", "READ", "LOW"],
      ["Describe CloudFront origin request policies", "cloudfront:ListOriginRequestPolicies", "READ", "LOW"],
      ["List GuardDuty API findings", "guardduty:ListFindings", "READ", "LOW"],
      ["Describe ELB listeners (L7)", "elasticloadbalancing:DescribeListeners", "READ", "LOW"],
      ["Update API Gateway stage (auth)", "apigateway:PUT", "WRITE", "HIGH"],
      ["Create WAF web ACL", "wafv2:CreateWebACL", "WRITE", "HIGH"],
      ["Update WAF web ACL", "wafv2:UpdateWebACL", "WRITE", "HIGH"],
      ["Create API usage plan key", "apigateway:POST", "WRITE", "MEDIUM"],
    ]),
  },
  {
    num: 13, title: "Data Security (DSPM)",
    subtitle: "S3, Macie, RDS, DynamoDB, Redshift, KMS, Glue — encryption, public access, sensitive data",
    ops: mkOps(13, [
      ["List S3 buckets", "s3:ListAllMyBuckets", "READ", "LOW"],
      ["Get S3 bucket ACL", "s3:GetBucketAcl", "READ", "LOW"],
      ["Get S3 bucket policy", "s3:GetBucketPolicy", "READ", "LOW"],
      ["Get S3 public access block", "s3:GetBucketPublicAccessBlock", "READ", "LOW"],
      ["Get S3 encryption", "s3:GetEncryptionConfiguration", "READ", "LOW"],
      ["Get S3 versioning", "s3:GetBucketVersioning", "READ", "LOW"],
      ["Get S3 replication", "s3:GetReplicationConfiguration", "READ", "LOW"],
      ["Get S3 CORS", "s3:GetBucketCors", "READ", "LOW"],
      ["Get S3 object lock", "s3:GetObjectLockConfiguration", "READ", "LOW"],
      ["List Macie findings", "macie2:ListFindings", "READ", "LOW"],
      ["Get Macie finding", "macie2:GetFinding", "READ", "LOW"],
      ["Describe Macie status", "macie2:GetMacieSession", "READ", "LOW"],
      ["Describe RDS instances", "rds:DescribeDBInstances", "READ", "LOW"],
      ["Describe RDS clusters", "rds:DescribeDBClusters", "READ", "LOW"],
      ["Describe RDS snapshots", "rds:DescribeDBSnapshots", "READ", "LOW"],
      ["Describe DynamoDB tables", "dynamodb:ListTables", "READ", "LOW"],
      ["Describe DynamoDB table", "dynamodb:DescribeTable", "READ", "LOW"],
      ["Describe Redshift clusters", "redshift:DescribeClusters", "READ", "LOW"],
      ["List KMS keys", "kms:ListKeys", "READ", "LOW"],
      ["Describe KMS key", "kms:DescribeKey", "READ", "LOW"],
      ["List KMS key grants", "kms:ListGrants", "READ", "LOW"],
      ["Describe Glue databases", "glue:GetDatabases", "READ", "LOW"],
      ["Put S3 public access block", "s3:PutBucketPublicAccessBlock", "WRITE", "HIGH"],
      ["Put S3 encryption", "s3:PutEncryptionConfiguration", "WRITE", "HIGH"],
      ["Put S3 bucket policy", "s3:PutBucketPolicy", "WRITE", "HIGH"],
      ["Enable Macie", "macie2:EnableMacie", "WRITE", "MEDIUM"],
      ["Create Macie classification job", "macie2:CreateClassificationJob", "WRITE", "MEDIUM"],
      ["Enable RDS encryption", "rds:ModifyDBInstance", "WRITE", "HIGH"],
    ]),
  },
  {
    num: 14, title: "SaaS Security (SSPM)",
    subtitle: "IAM Identity Center applications, SSO assignments, GuardDuty SaaS findings",
    ops: mkOps(14, [
      ["List IAM Identity Center applications", "sso:ListApplications", "READ", "LOW"],
      ["List IAM Identity Center account assignments", "sso:ListAccountAssignments", "READ", "LOW"],
      ["List trusted token issuers", "sso:ListTrustedTokenIssuers", "READ", "LOW"],
      ["Get IAM Identity Center instance", "sso:DescribeInstance", "READ", "LOW"],
      ["List GuardDuty SaaS API findings", "guardduty:ListFindings", "READ", "LOW"],
      ["List Security Hub enabled products", "securityhub:ListEnabledProductsForImport", "READ", "LOW"],
      ["Assign SSO permission set", "sso:CreateAccountAssignment", "WRITE", "HIGH"],
      ["Delete SSO assignment", "sso:DeleteAccountAssignment", "WRITE", "HIGH"],
    ]),
  },
  {
    num: 15, title: "AI Security Posture (AI-SPM)",
    subtitle: "Bedrock models/guardrails, SageMaker domains, AI BOM, training data privacy, GenAI attack surface",
    ops: mkOps(15, [
      ["List Bedrock foundation models", "bedrock:ListFoundationModels", "READ", "LOW"],
      ["Get Bedrock foundation model", "bedrock:GetFoundationModel", "READ", "LOW"],
      ["List Bedrock custom models", "bedrock:ListCustomModels", "READ", "LOW"],
      ["Get Bedrock custom model", "bedrock:GetCustomModel", "READ", "LOW"],
      ["Get Bedrock invocation logging config", "bedrock:GetModelInvocationLoggingConfiguration", "READ", "LOW"],
      ["List Bedrock Guardrails", "bedrock:ListGuardrails", "READ", "LOW"],
      ["Get Bedrock Guardrail", "bedrock:GetGuardrail", "READ", "LOW"],
      ["List Bedrock knowledge bases", "bedrock:ListKnowledgeBases", "READ", "LOW"],
      ["Get Bedrock knowledge base", "bedrock:GetKnowledgeBase", "READ", "LOW"],
      ["List SageMaker domains", "sagemaker:ListDomains", "READ", "LOW"],
      ["Describe SageMaker domain", "sagemaker:DescribeDomain", "READ", "LOW"],
      ["List SageMaker models", "sagemaker:ListModels", "READ", "LOW"],
      ["Describe SageMaker model", "sagemaker:DescribeModel", "READ", "LOW"],
      ["List SageMaker endpoints", "sagemaker:ListEndpoints", "READ", "LOW"],
      ["List SageMaker training jobs", "sagemaker:ListTrainingJobs", "READ", "LOW"],
      ["Get SageMaker model card", "sagemaker:DescribeModelCard", "READ", "LOW"],
      ["Describe Macie (training data privacy)", "macie2:GetMacieSession", "READ", "LOW"],
      ["GuardDuty AI API findings", "guardduty:ListFindings", "READ", "LOW"],
      ["Update Bedrock Guardrail", "bedrock:UpdateGuardrail", "WRITE", "HIGH"],
      ["Delete Bedrock custom model", "bedrock:DeleteCustomModel", "WRITE", "HIGH"],
      ["Stop SageMaker training job", "sagemaker:StopTrainingJob", "WRITE", "MEDIUM"],
      ["Delete SageMaker endpoint", "sagemaker:DeleteEndpoint", "WRITE", "HIGH"],
      ["Put model invocation logging config", "bedrock:PutModelInvocationLoggingConfiguration", "WRITE", "MEDIUM"],
    ]),
  },
];

/* ─── Azure CNAPP Layers Data ─── */

const AZURE_LAYERS: CnappLayer[] = [
  {
    num: 1, title: "Identity & Access (CIEM)",
    subtitle: "Entra ID users, groups, roles, MFA, PIM, Conditional Access, app registrations, OAuth consents",
    ops: mkOps(1, [
      ["Read all users", "User.Read.All", "READ", "LOW"],
      ["Read all groups", "Group.Read.All", "READ", "LOW"],
      ["Read group members", "GroupMember.Read.All", "READ", "LOW"],
      ["Read directory roles", "RoleManagement.Read.Directory", "READ", "LOW"],
      ["Read all role assignments", "RoleManagement.Read.All", "READ", "LOW"],
      ["Read org policies", "Policy.Read.All", "READ", "LOW"],
      ["Read identity risky users", "IdentityRiskyUser.Read.All", "READ", "LOW"],
      ["Read identity risk events", "IdentityRiskEvent.Read.All", "READ", "LOW"],
      ["Read sign-in activity reports", "AuditLog.Read.All", "READ", "LOW"],
      ["Read directory audit logs", "AuditLog.Read.All", "READ", "LOW"],
      ["Read application registrations", "Application.Read.All", "READ", "LOW"],
      ["Read service principals", "Application.Read.All", "READ", "LOW"],
      ["Read OAuth2 permission grants", "DelegatedPermissionGrant.Read.All", "READ", "LOW"],
      ["Read app role assignments", "AppRoleAssignment.Read.All", "READ", "LOW"],
      ["Read MFA authentication methods", "UserAuthenticationMethod.Read.All", "READ", "LOW"],
      ["Read PIM eligible assignments", "PrivilegedAccess.Read.AzureAD", "READ", "LOW"],
      ["Read Conditional Access policies", "Policy.Read.ConditionalAccess", "READ", "LOW"],
      ["ARM: Read role assignments", "Microsoft.Authorization/roleAssignments/read", "READ", "LOW"],
      ["ARM: Read role definitions", "Microsoft.Authorization/roleDefinitions/read", "READ", "LOW"],
      ["ARM: Read management groups", "Microsoft.Management/managementGroups/read", "READ", "LOW"],
      ["ARM: Read policy assignments", "Microsoft.Authorization/policyAssignments/read", "READ", "LOW"],
      ["Update user", "User.ReadWrite.All", "WRITE", "HIGH"],
      ["Manage role assignments", "RoleManagement.ReadWrite.Directory", "WRITE", "HIGH"],
      ["Update Conditional Access", "Policy.ReadWrite.ConditionalAccess", "WRITE", "HIGH"],
      ["Revoke sign-in sessions", "Directory.ReadWrite.All", "WRITE", "HIGH"],
      ["ARM: Create role assignments", "Microsoft.Authorization/roleAssignments/write", "WRITE", "HIGH"],
      ["ARM: Delete role assignments", "Microsoft.Authorization/roleAssignments/delete", "WRITE", "HIGH"],
      ["Update PIM assignments", "PrivilegedAccess.ReadWrite.AzureAD", "WRITE", "HIGH"],
    ]),
  },
  {
    num: 2, title: "Non-Human Identity (NHI)",
    subtitle: "Managed identities, service principals, app credentials, Key Vault keys, Function/AKS identities",
    ops: mkOps(2, [
      ["Read managed identities", "Microsoft.ManagedIdentity/userAssignedIdentities/read", "READ", "LOW"],
      ["Read system-assigned identities", "ARM resource metadata", "READ", "LOW"],
      ["Read service principals", "Application.Read.All", "READ", "LOW"],
      ["Read app credentials metadata", "Application.Read.All", "READ", "LOW"],
      ["Read Key Vault secrets metadata", "Microsoft.KeyVault/vaults/secrets/read", "READ", "LOW"],
      ["Read Key Vault keys metadata", "Microsoft.KeyVault/vaults/keys/read", "READ", "LOW"],
      ["List Key Vaults", "Microsoft.KeyVault/vaults/read", "READ", "LOW"],
      ["Read Function App identity", "Microsoft.Web/sites/read", "READ", "LOW"],
      ["Read AKS cluster identity", "Microsoft.ContainerService/managedClusters/read", "READ", "LOW"],
      ["Read Logic App connections", "Microsoft.Logic/workflows/read", "READ", "LOW"],
      ["Read automation accounts", "Microsoft.Automation/automationAccounts/read", "READ", "LOW"],
      ["Rotate Key Vault secret", "Microsoft.KeyVault/vaults/secrets/write", "WRITE", "HIGH"],
      ["Delete app credential", "Application.ReadWrite.All", "WRITE", "HIGH"],
      ["Create managed identity role assignment", "Microsoft.Authorization/roleAssignments/write", "WRITE", "HIGH"],
    ]),
  },
  {
    num: 3, title: "Posture & Config (CSPM)",
    subtitle: "Defender for Cloud assessments, Secure Score, Resource Graph, Policy compliance, storage config",
    ops: mkOps(3, [
      ["Read Defender for Cloud assessments", "Microsoft.Security/assessments/read", "READ", "LOW"],
      ["Read Secure Score", "Microsoft.Security/secureScores/read", "READ", "LOW"],
      ["Read Secure Score controls", "Microsoft.Security/secureScoreControls/read", "READ", "LOW"],
      ["Read security recommendations", "Microsoft.Security/recommendations/read", "READ", "LOW"],
      ["Read security contacts", "Microsoft.Security/securityContacts/read", "READ", "LOW"],
      ["Read security settings", "Microsoft.Security/settings/read", "READ", "LOW"],
      ["Read subscriptions", "Microsoft.Resources/subscriptions/read", "READ", "LOW"],
      ["Read resource groups", "Microsoft.Resources/subscriptions/resourceGroups/read", "READ", "LOW"],
      ["Read all resources (Resource Graph)", "Microsoft.ResourceGraph/resources/read", "READ", "LOW"],
      ["Read Azure Policy assignments", "Microsoft.Authorization/policyAssignments/read", "READ", "LOW"],
      ["Read Azure Policy definitions", "Microsoft.Authorization/policyDefinitions/read", "READ", "LOW"],
      ["Read Azure Policy compliance", "Microsoft.PolicyInsights/policyStates/read", "READ", "LOW"],
      ["Read storage accounts", "Microsoft.Storage/storageAccounts/read", "READ", "LOW"],
      ["Read key vaults", "Microsoft.KeyVault/vaults/read", "READ", "LOW"],
      ["Read diagnostic settings", "Microsoft.Insights/diagnosticSettings/read", "READ", "LOW"],
      ["Read activity log", "Microsoft.Insights/eventtypes/values/read", "READ", "LOW"],
      ["Write policy assignment", "Microsoft.Authorization/policyAssignments/write", "WRITE", "MEDIUM"],
      ["Trigger policy remediation", "Microsoft.PolicyInsights/remediations/write", "WRITE", "HIGH"],
      ["Update Defender settings", "Microsoft.Security/settings/write", "WRITE", "MEDIUM"],
    ]),
  },
  {
    num: 4, title: "Compliance & Governance",
    subtitle: "Regulatory compliance assessments, Policy insights, Compliance Manager, Management Groups",
    ops: mkOps(4, [
      ["Read regulatory compliance assessments", "Microsoft.Security/regulatoryComplianceAssessments/read", "READ", "LOW"],
      ["Read regulatory compliance controls", "Microsoft.Security/regulatoryComplianceControls/read", "READ", "LOW"],
      ["Read regulatory compliance standards", "Microsoft.Security/regulatoryComplianceStandards/read", "READ", "LOW"],
      ["Read policy compliance states", "Microsoft.PolicyInsights/policyStates/read", "READ", "LOW"],
      ["Read compliance summary", "Microsoft.PolicyInsights/policyStates/summarize/action", "READ", "LOW"],
      ["Read Compliance Manager assessments", "Microsoft.ComplianceManagement/assessments/read", "READ", "LOW"],
      ["Read Management Group", "Microsoft.Management/managementGroups/read", "READ", "LOW"],
      ["Create compliance assessment", "Microsoft.ComplianceManagement/assessments/write", "WRITE", "MEDIUM"],
      ["Assign compliance initiative", "Microsoft.Authorization/policySetDefinitions/write", "WRITE", "MEDIUM"],
    ]),
  },
  {
    num: 5, title: "Workload Protection (CWPP)",
    subtitle: "Defender for Servers, VM vulnerability assessments, JIT access, App Service, AKS workloads",
    ops: mkOps(5, [
      ["Read Defender for Servers plan", "Microsoft.Security/pricings/read", "READ", "LOW"],
      ["Read VM assessments", "Microsoft.Security/assessments/read", "READ", "LOW"],
      ["Read VM vulnerability assessments", "Microsoft.Security/serverVulnerabilityAssessments/read", "READ", "LOW"],
      ["Read VM extensions", "Microsoft.Compute/virtualMachines/extensions/read", "READ", "LOW"],
      ["Read VMs", "Microsoft.Compute/virtualMachines/read", "READ", "LOW"],
      ["Read VMSS", "Microsoft.Compute/virtualMachineScaleSets/read", "READ", "LOW"],
      ["Read App Service apps", "Microsoft.Web/sites/read", "READ", "LOW"],
      ["Read Azure Functions", "Microsoft.Web/sites/functions/read", "READ", "LOW"],
      ["Read AKS workloads", "Microsoft.ContainerService/managedClusters/read", "READ", "LOW"],
      ["Read Defender alerts", "Microsoft.Security/alerts/read", "READ", "LOW"],
      ["Read JIT access policies", "Microsoft.Security/jitNetworkAccessPolicies/read", "READ", "LOW"],
      ["Enable Defender for Servers", "Microsoft.Security/pricings/write", "WRITE", "HIGH"],
      ["Trigger VM scan", "Microsoft.Security/serverVulnerabilityAssessments/write", "WRITE", "MEDIUM"],
      ["Initiate JIT access", "Microsoft.Security/jitNetworkAccessPolicies/initiate/action", "WRITE", "HIGH"],
      ["Update alert status", "Microsoft.Security/alerts/write", "WRITE", "MEDIUM"],
      ["Deallocate VM", "Microsoft.Compute/virtualMachines/deallocate/action", "WRITE", "HIGH"],
    ]),
  },
  {
    num: 6, title: "Containers & Kubernetes (KSPM)",
    subtitle: "AKS cluster posture, ACR image vulnerabilities, container instance groups",
    ops: mkOps(6, [
      ["Read AKS clusters", "Microsoft.ContainerService/managedClusters/read", "READ", "LOW"],
      ["Read AKS agent pools", "Microsoft.ContainerService/managedClusters/agentPools/read", "READ", "LOW"],
      ["Read AKS diagnostics", "Microsoft.ContainerService/managedClusters/diagnosticsSettings/read", "READ", "LOW"],
      ["Read ACR registries", "Microsoft.ContainerRegistry/registries/read", "READ", "LOW"],
      ["Read ACR repositories", "Microsoft.ContainerRegistry/registries/repositories/read", "READ", "LOW"],
      ["Read ACR images", "Microsoft.ContainerRegistry/registries/artifacts/read", "READ", "LOW"],
      ["Read Defender for Containers plan", "Microsoft.Security/pricings/read", "READ", "LOW"],
      ["Read container image vulnerabilities", "Microsoft.Security/serverVulnerabilityAssessments/read", "READ", "LOW"],
      ["Read container instance groups", "Microsoft.ContainerInstance/containerGroups/read", "READ", "LOW"],
      ["Run ACR image scan", "Microsoft.ContainerRegistry/registries/buildTask/write", "WRITE", "MEDIUM"],
      ["Delete ACR image", "Microsoft.ContainerRegistry/registries/delete", "WRITE", "HIGH"],
      ["Update AKS cluster", "Microsoft.ContainerService/managedClusters/write", "WRITE", "HIGH"],
      ["Enable Defender for Containers", "Microsoft.Security/pricings/write", "WRITE", "HIGH"],
    ]),
  },
  {
    num: 7, title: "Network Security",
    subtitle: "VNets, NSGs, Azure Firewall, WAF, DDoS, ExpressRoute, Private Endpoints, Network Watcher",
    ops: mkOps(7, [
      ["Read VNets", "Microsoft.Network/virtualNetworks/read", "READ", "LOW"],
      ["Read subnets", "Microsoft.Network/virtualNetworks/subnets/read", "READ", "LOW"],
      ["Read NSGs", "Microsoft.Network/networkSecurityGroups/read", "READ", "LOW"],
      ["Read NSG rules", "Microsoft.Network/networkSecurityGroups/securityRules/read", "READ", "LOW"],
      ["Read NSG flow logs", "Microsoft.Network/networkSecurityGroups/flowLogs/read", "READ", "LOW"],
      ["Read route tables", "Microsoft.Network/routeTables/read", "READ", "LOW"],
      ["Read public IPs", "Microsoft.Network/publicIPAddresses/read", "READ", "LOW"],
      ["Read Azure Firewall", "Microsoft.Network/azureFirewalls/read", "READ", "LOW"],
      ["Read Azure WAF policy", "Microsoft.Network/ApplicationGatewayWebApplicationFirewallPolicies/read", "READ", "LOW"],
      ["Read DDoS protection plans", "Microsoft.Network/ddosProtectionPlans/read", "READ", "LOW"],
      ["Read ExpressRoute", "Microsoft.Network/expressRouteCircuits/read", "READ", "LOW"],
      ["Read Private Endpoints", "Microsoft.Network/privateEndpoints/read", "READ", "LOW"],
      ["Read network watchers", "Microsoft.Network/networkWatchers/read", "READ", "LOW"],
      ["Update NSG rules", "Microsoft.Network/networkSecurityGroups/securityRules/write", "WRITE", "HIGH"],
      ["Enable NSG flow logs", "Microsoft.Network/networkSecurityGroups/flowLogs/write", "WRITE", "MEDIUM"],
      ["Update WAF policy", "Microsoft.Network/ApplicationGatewayWebApplicationFirewallPolicies/write", "WRITE", "HIGH"],
    ]),
  },
  {
    num: 8, title: "Threat Detection (CDR)",
    subtitle: "Defender XDR alerts, Sentinel incidents/rules, threat intelligence, threat hunting queries",
    ops: mkOps(8, [
      ["Read security alerts", "SecurityAlert.Read.All", "READ", "LOW"],
      ["Read security incidents", "SecurityIncident.Read.All", "READ", "LOW"],
      ["Read security events", "SecurityEvents.Read.All", "READ", "LOW"],
      ["Read threat intelligence indicators", "ThreatIndicators.Read.All", "READ", "LOW"],
      ["Run threat hunting queries", "ThreatHunting.Read.All", "READ", "MEDIUM"],
      ["Read Defender XDR alerts", "SecurityAlert.Read.All", "READ", "LOW"],
      ["Read Sentinel incidents", "Microsoft.SecurityInsights/incidents/read", "READ", "LOW"],
      ["Read Sentinel analytics rules", "Microsoft.SecurityInsights/alertRules/read", "READ", "LOW"],
      ["Read Sentinel watchlists", "Microsoft.SecurityInsights/watchlists/read", "READ", "LOW"],
      ["Read Sentinel hunt queries", "Microsoft.SecurityInsights/huntingQueries/read", "READ", "LOW"],
      ["Read Azure Monitor alerts", "Microsoft.Insights/alertRules/read", "READ", "LOW"],
      ["Update security alert", "SecurityAlert.ReadWrite.All", "WRITE", "MEDIUM"],
      ["Update security incident", "SecurityIncident.ReadWrite.All", "WRITE", "MEDIUM"],
      ["Create threat indicator", "ThreatIndicators.ReadWrite.OwnedBy", "WRITE", "MEDIUM"],
      ["Create Sentinel analytics rule", "Microsoft.SecurityInsights/alertRules/write", "WRITE", "MEDIUM"],
      ["Dismiss Defender alert", "SecurityAlert.ReadWrite.All", "WRITE", "MEDIUM"],
    ]),
  },
  {
    num: 9, title: "IaC & DevSecOps",
    subtitle: "ARM deployments, Defender for DevOps, Azure DevOps pipelines, GitHub Advanced Security",
    ops: mkOps(9, [
      ["Read ARM deployments", "Microsoft.Resources/deployments/read", "READ", "LOW"],
      ["Read ARM deployment operations", "Microsoft.Resources/deployments/operations/read", "READ", "LOW"],
      ["Read Defender for DevOps results", "Microsoft.Security/devops/read", "READ", "LOW"],
      ["Read Azure DevOps pipelines", "ADO PAT: vso.build", "READ", "LOW"],
      ["Read GitHub Advanced Security alerts", "GitHub App: security_events", "READ", "LOW"],
      ["Read Bicep/ARM templates (Resource Graph)", "Microsoft.ResourceGraph/resources/read", "READ", "LOW"],
      ["Create/update ARM deployment", "Microsoft.Resources/deployments/write", "WRITE", "HIGH"],
      ["Delete ARM deployment", "Microsoft.Resources/deployments/delete", "WRITE", "HIGH"],
      ["Trigger ADO pipeline", "ADO PAT: vso.build_execute", "WRITE", "MEDIUM"],
    ]),
  },
  {
    num: 10, title: "Supply Chain & SBOM",
    subtitle: "ACR image manifests, GitHub Advanced Security supply chain, Defender for DevOps SBOM, Content Trust",
    ops: mkOps(10, [
      ["Read ACR image manifests", "Microsoft.ContainerRegistry/registries/pull/read", "READ", "LOW"],
      ["Read GitHub Advanced Security supply chain alerts", "GitHub App: security_events", "READ", "LOW"],
      ["Read Defender for DevOps SBOM report", "Microsoft.Security/devops/read", "READ", "LOW"],
      ["Read Microsoft SBOM Tool output", "Microsoft.Security/serverVulnerabilityAssessments/read", "READ", "LOW"],
      ["Read ACR Content Trust (notary)", "Microsoft.ContainerRegistry/registries/read", "READ", "LOW"],
      ["Import ACR image", "Microsoft.ContainerRegistry/registries/importImage/action", "WRITE", "MEDIUM"],
      ["Delete ACR tag", "Microsoft.ContainerRegistry/registries/artifacts/delete", "WRITE", "HIGH"],
      ["Enable ACR Content Trust", "Microsoft.ContainerRegistry/registries/write", "WRITE", "MEDIUM"],
    ]),
  },
  {
    num: 11, title: "Secrets Detection",
    subtitle: "Key Vault secrets/keys/certs metadata, GitHub secret alerts, Defender for DevOps, Entra app secrets",
    ops: mkOps(11, [
      ["Read Key Vault secrets metadata", "Microsoft.KeyVault/vaults/secrets/read", "READ", "LOW"],
      ["Read Key Vault keys metadata", "Microsoft.KeyVault/vaults/keys/read", "READ", "LOW"],
      ["Read Key Vault certificates metadata", "Microsoft.KeyVault/vaults/certificates/read", "READ", "LOW"],
      ["Read Key Vault vault metadata", "Microsoft.KeyVault/vaults/read", "READ", "LOW"],
      ["Read GitHub Advanced Security secret alerts", "GitHub App: security_events", "READ", "LOW"],
      ["Read Defender for DevOps secret scanning", "Microsoft.Security/devops/read", "READ", "LOW"],
      ["Read Entra app client secrets metadata", "Application.Read.All", "READ", "LOW"],
      ["Read Managed Identity credentials", "Microsoft.ManagedIdentity/userAssignedIdentities/read", "READ", "LOW"],
      ["Rotate Key Vault secret", "Microsoft.KeyVault/vaults/secrets/write", "WRITE", "HIGH"],
      ["Delete Key Vault secret", "Microsoft.KeyVault/vaults/secrets/delete", "WRITE", "HIGH"],
      ["Expire app client secret", "Application.ReadWrite.OwnedBy", "WRITE", "HIGH"],
    ]),
  },
  {
    num: 12, title: "API Security",
    subtitle: "API Management services, Defender for APIs, Azure API Center, WAF policies for APIM",
    ops: mkOps(12, [
      ["Read API Management services", "Microsoft.ApiManagement/service/read", "READ", "LOW"],
      ["Read APIM APIs", "Microsoft.ApiManagement/service/apis/read", "READ", "LOW"],
      ["Read APIM API operations", "Microsoft.ApiManagement/service/apis/operations/read", "READ", "LOW"],
      ["Read APIM subscriptions", "Microsoft.ApiManagement/service/subscriptions/read", "READ", "LOW"],
      ["Read Defender for APIs findings", "Microsoft.Security/apiCollections/read", "READ", "LOW"],
      ["Read Defender for APIs alerts", "Microsoft.Security/alerts/read", "READ", "LOW"],
      ["Read Azure API Center APIs", "Microsoft.ApiCenter/services/apis/read", "READ", "LOW"],
      ["Read WAF policies (APIM)", "Microsoft.Network/ApplicationGatewayWebApplicationFirewallPolicies/read", "READ", "LOW"],
      ["Enable Defender for APIs", "Microsoft.Security/pricings/write", "WRITE", "HIGH"],
      ["Update APIM API policy", "Microsoft.ApiManagement/service/apis/policies/write", "WRITE", "HIGH"],
      ["Block APIM subscription", "Microsoft.ApiManagement/service/subscriptions/write", "WRITE", "MEDIUM"],
    ]),
  },
  {
    num: 13, title: "Data Security (DSPM)",
    subtitle: "Storage accounts, SQL TDE, CosmosDB, Purview data catalog, Defender for Databases, Key Vault",
    ops: mkOps(13, [
      ["Read storage accounts", "Microsoft.Storage/storageAccounts/read", "READ", "LOW"],
      ["Read storage account keys metadata", "Microsoft.Storage/storageAccounts/listKeys/action", "READ", "MEDIUM"],
      ["Read Blob service properties", "Microsoft.Storage/storageAccounts/blobServices/read", "READ", "LOW"],
      ["Read Defender for Storage alerts", "Microsoft.Security/alerts/read", "READ", "LOW"],
      ["Read Azure SQL servers", "Microsoft.Sql/servers/read", "READ", "LOW"],
      ["Read Azure SQL databases", "Microsoft.Sql/servers/databases/read", "READ", "LOW"],
      ["Read Azure SQL TDE status", "Microsoft.Sql/servers/databases/transparentDataEncryption/read", "READ", "LOW"],
      ["Read Azure SQL audit policies", "Microsoft.Sql/servers/auditingSettings/read", "READ", "LOW"],
      ["Read CosmosDB accounts", "Microsoft.DocumentDB/databaseAccounts/read", "READ", "LOW"],
      ["Read Purview data catalog", "Microsoft.Purview/accounts/read", "READ", "LOW"],
      ["Read Purview scan results", "Microsoft.Purview/accounts/readScanResult/action", "READ", "LOW"],
      ["Read Key Vault access policies", "Microsoft.KeyVault/vaults/read", "READ", "LOW"],
      ["Read Defender for Databases plan", "Microsoft.Security/pricings/read", "READ", "LOW"],
      ["Enable storage encryption", "Microsoft.Storage/storageAccounts/write", "WRITE", "HIGH"],
      ["Enable SQL TDE", "Microsoft.Sql/servers/databases/transparentDataEncryption/write", "WRITE", "HIGH"],
      ["Enable Defender for Databases", "Microsoft.Security/pricings/write", "WRITE", "HIGH"],
      ["Trigger Purview scan", "Microsoft.Purview/accounts/runScan/action", "WRITE", "MEDIUM"],
    ]),
  },
  {
    num: 14, title: "SaaS Security (SSPM)",
    subtitle: "M365 Secure Score, Entra apps, SharePoint, Teams, Exchange, Conditional Access, MCAS discovered apps",
    ops: mkOps(14, [
      ["Read M365 Secure Score", "SecurityEvents.Read.All", "READ", "LOW"],
      ["Read all users (M365)", "User.Read.All", "READ", "LOW"],
      ["Read all groups", "Group.Read.All", "READ", "LOW"],
      ["Read OAuth2 permission grants (consent)", "DelegatedPermissionGrant.Read.All", "READ", "LOW"],
      ["Read Entra app registrations", "Application.Read.All", "READ", "LOW"],
      ["Read Entra service principals", "Application.Read.All", "READ", "LOW"],
      ["Read SharePoint sites", "Sites.Read.All", "READ", "LOW"],
      ["Read Exchange mailbox settings", "MailboxSettings.Read", "READ", "LOW"],
      ["Read Teams settings", "Team.ReadBasic.All", "READ", "LOW"],
      ["Read Conditional Access policies", "Policy.Read.ConditionalAccess", "READ", "LOW"],
      ["Read auth methods policy", "Policy.Read.AuthenticationMethod", "READ", "LOW"],
      ["Read Defender for Cloud Apps alerts", "MCAS API token (Bearer)", "READ", "LOW"],
      ["Read MCAS SaaS app activity", "MCAS API: activities/ endpoint", "READ", "LOW"],
      ["Read MCAS SaaS discovered apps", "MCAS API: discovery/ endpoint", "READ", "LOW"],
      ["Revoke OAuth consent", "DelegatedPermissionGrant.ReadWrite.All", "WRITE", "HIGH"],
      ["Disable Entra app", "Application.ReadWrite.OwnedBy", "WRITE", "HIGH"],
      ["Block user sign-in", "User.ReadWrite.All", "WRITE", "HIGH"],
    ]),
  },
  {
    num: 15, title: "AI Security Posture (AI-SPM)",
    subtitle: "Defender AI SPM, Azure AI Foundry, Azure ML models/endpoints, Azure OpenAI, AI Content Safety",
    ops: mkOps(15, [
      ["Read Defender AI Security Posture", "Microsoft.Security/pricings/read", "READ", "LOW"],
      ["Read AI workload assessments", "Microsoft.Security/assessments/read", "READ", "LOW"],
      ["Read Azure AI Foundry projects", "Microsoft.MachineLearningServices/workspaces/read", "READ", "LOW"],
      ["Read Azure ML models", "Microsoft.MachineLearningServices/workspaces/models/read", "READ", "LOW"],
      ["Read Azure ML endpoints", "Microsoft.MachineLearningServices/workspaces/onlineEndpoints/read", "READ", "LOW"],
      ["Read Azure ML datasets", "Microsoft.MachineLearningServices/workspaces/datasets/read", "READ", "LOW"],
      ["Read Azure OpenAI accounts", "Microsoft.CognitiveServices/accounts/read", "READ", "LOW"],
      ["Read Azure OpenAI deployments", "Microsoft.CognitiveServices/accounts/deployments/read", "READ", "LOW"],
      ["Read Azure AI Content Safety", "Microsoft.CognitiveServices/accounts/read", "READ", "LOW"],
      ["Read Copilot for Security incidents", "SecurityIncident.Read.All", "READ", "LOW"],
      ["Read AI workload vulnerabilities", "Microsoft.Security/serverVulnerabilityAssessments/read", "READ", "LOW"],
      ["Enable Defender AI SPM", "Microsoft.Security/pricings/write", "WRITE", "HIGH"],
      ["Update Azure OpenAI model filters", "Microsoft.CognitiveServices/accounts/write", "WRITE", "HIGH"],
      ["Delete ML model deployment", "Microsoft.MachineLearningServices/workspaces/onlineEndpoints/delete", "WRITE", "HIGH"],
      ["Update Azure AI Content Safety policies", "Microsoft.CognitiveServices/accounts/write", "WRITE", "HIGH"],
    ]),
  },
];

/* ─── GCP CNAPP Layers Data ─── */

const GCP_LAYERS: CnappLayer[] = [
  {
    num: 1, title: "Identity & Access (CIEM)",
    subtitle: "Service accounts, IAM policies, organization roles, workload identity, Workspace users",
    ops: mkOps(1, [
      ["List service accounts", "iam.serviceAccounts.list", "READ", "LOW"],
      ["Get service account", "iam.serviceAccounts.get", "READ", "LOW"],
      ["List service account keys", "iam.serviceAccountKeys.list", "READ", "LOW"],
      ["Get service account key", "iam.serviceAccountKeys.get", "READ", "LOW"],
      ["Get IAM policy (project)", "resourcemanager.projects.getIamPolicy", "READ", "LOW"],
      ["Get IAM policy (org)", "resourcemanager.organizations.getIamPolicy", "READ", "MEDIUM"],
      ["Get IAM policy (folder)", "resourcemanager.folders.getIamPolicy", "READ", "LOW"],
      ["List organizations", "resourcemanager.organizations.get", "READ", "LOW"],
      ["List projects", "resourcemanager.projects.list", "READ", "LOW"],
      ["List folders", "resourcemanager.folders.list", "READ", "LOW"],
      ["Analyze IAM policy", "cloudasset.assets.analyzeIamPolicy", "READ", "MEDIUM"],
      ["Search all IAM policies", "cloudasset.assets.searchAllIamPolicies", "READ", "MEDIUM"],
      ["Get IAM policy analyzer", "iam.iamPolicies.get", "READ", "LOW"],
      ["Query grantable roles", "iam.roles.get", "READ", "LOW"],
      ["List predefined roles", "iam.roles.list", "READ", "LOW"],
      ["Get workforce pool", "iam.workforcePools.get", "READ", "LOW"],
      ["Get workload identity pool", "iam.workloadIdentityPools.get", "READ", "LOW"],
      ["List workload identity pools", "iam.workloadIdentityPools.list", "READ", "LOW"],
      ["Admin SDK: List users (Workspace)", "admin.directory.user.readonly", "READ", "LOW"],
      ["Admin SDK: List groups", "admin.directory.group.readonly", "READ", "LOW"],
      ["Set IAM policy (project)", "resourcemanager.projects.setIamPolicy", "WRITE", "HIGH"],
      ["Set IAM policy (org)", "resourcemanager.organizations.setIamPolicy", "WRITE", "HIGH"],
      ["Delete service account", "iam.serviceAccounts.delete", "WRITE", "HIGH"],
      ["Disable service account", "iam.serviceAccounts.disable", "WRITE", "MEDIUM"],
      ["Delete service account key", "iam.serviceAccountKeys.delete", "WRITE", "HIGH"],
      ["Create service account key", "iam.serviceAccountKeys.create", "WRITE", "HIGH"],
      ["Update IAM policy (deny)", "iam.denypolicies.create", "WRITE", "MEDIUM"],
    ]),
  },
  {
    num: 2, title: "Non-Human Identity (NHI)",
    subtitle: "Service account keys, workload identity pools, Secret Manager, Cloud Functions, Vertex AI agents",
    ops: mkOps(2, [
      ["List service accounts", "iam.serviceAccounts.list", "READ", "LOW"],
      ["List SA keys", "iam.serviceAccountKeys.list", "READ", "LOW"],
      ["Get SA IAM policy", "iam.serviceAccounts.getIamPolicy", "READ", "LOW"],
      ["List workload identity pools", "iam.workloadIdentityPools.list", "READ", "LOW"],
      ["Get workload identity pool", "iam.workloadIdentityPools.get", "READ", "LOW"],
      ["List Secret Manager secrets", "secretmanager.secrets.list", "READ", "LOW"],
      ["Get secret metadata", "secretmanager.secrets.get", "READ", "LOW"],
      ["List secret versions", "secretmanager.versions.list", "READ", "LOW"],
      ["List Cloud Functions", "cloudfunctions.functions.list", "READ", "LOW"],
      ["Get Cloud Function", "cloudfunctions.functions.get", "READ", "LOW"],
      ["List Cloud Run services", "run.services.list", "READ", "LOW"],
      ["Get Cloud Run service", "run.services.get", "READ", "LOW"],
      ["List Vertex AI models", "aiplatform.models.list", "READ", "LOW"],
      ["Get Vertex AI endpoint", "aiplatform.endpoints.get", "READ", "LOW"],
      ["Delete SA key", "iam.serviceAccountKeys.delete", "WRITE", "HIGH"],
      ["Disable SA key", "iam.serviceAccountKeys.disable", "WRITE", "MEDIUM"],
      ["Add secret version", "secretmanager.versions.add", "WRITE", "HIGH"],
      ["Destroy secret version", "secretmanager.versions.destroy", "WRITE", "HIGH"],
    ]),
  },
  {
    num: 3, title: "Posture & Config (CSPM)",
    subtitle: "SCC findings, asset inventory, org policies, compute, storage, KMS, logging sinks",
    ops: mkOps(3, [
      ["List SCC findings", "securitycenter.findings.list", "READ", "LOW"],
      ["Get SCC findings", "securitycenter.findings.get", "READ", "LOW"],
      ["List SCC assets", "securitycenter.assets.list", "READ", "LOW"],
      ["Get SCC organization settings", "securitycenter.organizationsettings.get", "READ", "LOW"],
      ["List SCC sources", "securitycenter.sources.list", "READ", "LOW"],
      ["Search all resources (Asset Inv.)", "cloudasset.assets.searchAllResources", "READ", "LOW"],
      ["Search all IAM policies", "cloudasset.assets.searchAllIamPolicies", "READ", "LOW"],
      ["Export assets", "cloudasset.assets.exportResource", "READ", "LOW"],
      ["Get org policy", "orgpolicy.policies.list", "READ", "LOW"],
      ["List org constraints", "orgpolicy.constraints.list", "READ", "LOW"],
      ["Get compute project info", "compute.projects.get", "READ", "LOW"],
      ["List compute instances", "compute.instances.list", "READ", "LOW"],
      ["List storage buckets", "storage.buckets.list", "READ", "LOW"],
      ["Get bucket IAM policy", "storage.buckets.getIamPolicy", "READ", "LOW"],
      ["List Cloud SQL instances", "cloudsql.instances.list", "READ", "LOW"],
      ["Get Cloud SQL instance", "cloudsql.instances.get", "READ", "LOW"],
      ["List KMS key rings", "cloudkms.keyRings.list", "READ", "LOW"],
      ["List KMS crypto keys", "cloudkms.cryptoKeys.list", "READ", "LOW"],
      ["Get logging sinks", "logging.sinks.list", "READ", "LOW"],
      ["Update SCC finding state", "securitycenter.findings.update", "WRITE", "MEDIUM"],
      ["Set org policy", "orgpolicy.policies.create", "WRITE", "HIGH"],
      ["Set IAM policy on bucket", "storage.buckets.setIamPolicy", "WRITE", "HIGH"],
    ]),
  },
  {
    num: 4, title: "Compliance & Governance",
    subtitle: "SCC compliance findings, Assured Workloads, org policy constraints, audit log entries",
    ops: mkOps(4, [
      ["List SCC compliance findings", "securitycenter.findings.list", "READ", "LOW"],
      ["Get Assured Workloads workload", "assuredworkloads.operations.get", "READ", "LOW"],
      ["List Assured Workloads", "assuredworkloads.workloads.list", "READ", "LOW"],
      ["List org policy constraints", "orgpolicy.constraints.list", "READ", "LOW"],
      ["List audit log entries", "logging.logEntries.list", "READ", "LOW"],
      ["Get audit log config", "logging.logEntries.list", "READ", "LOW"],
      ["Export compliance report", "securitycenter.findings.group", "READ", "LOW"],
      ["Create Assured Workload", "assuredworkloads.workloads.create", "WRITE", "HIGH"],
      ["Update org policy", "orgpolicy.policies.create", "WRITE", "HIGH"],
    ]),
  },
  {
    num: 5, title: "Workload Protection (CWPP)",
    subtitle: "Compute instances, Cloud Functions, Cloud Run, OS Config/VM Manager, SCC vulnerability findings",
    ops: mkOps(5, [
      ["List compute instances", "compute.instances.list", "READ", "LOW"],
      ["Get compute instance", "compute.instances.get", "READ", "LOW"],
      ["List compute machine images", "compute.machineImages.list", "READ", "LOW"],
      ["List Cloud Functions", "cloudfunctions.functions.list", "READ", "LOW"],
      ["Get Cloud Run service", "run.services.get", "READ", "LOW"],
      ["List SCC vulnerability findings", "securitycenter.findings.list", "READ", "LOW"],
      ["List OS inventory (VM Manager)", "osconfig.inventories.list", "READ", "LOW"],
      ["Get OS patch deployment", "osconfig.patchDeployments.get", "READ", "LOW"],
      ["Get OS vulnerability report", "osconfig.vulnerabilityReports.get", "READ", "LOW"],
      ["List OS patch jobs", "osconfig.patchJobs.list", "READ", "LOW"],
      ["Execute OS patch job", "osconfig.patchJobs.create", "WRITE", "HIGH"],
      ["Stop compute instance", "compute.instances.stop", "WRITE", "HIGH"],
      ["Reset compute instance", "compute.instances.reset", "WRITE", "HIGH"],
      ["Update SCC finding state", "securitycenter.findings.update", "WRITE", "MEDIUM"],
    ]),
  },
  {
    num: 6, title: "Containers & Kubernetes (KSPM)",
    subtitle: "GKE clusters, node pools, Artifact Registry, Binary Authorization, container vulnerability reports",
    ops: mkOps(6, [
      ["List GKE clusters", "container.clusters.list", "READ", "LOW"],
      ["Get GKE cluster", "container.clusters.get", "READ", "LOW"],
      ["List GKE node pools", "container.nodePools.list", "READ", "LOW"],
      ["Get GKE cluster security posture", "container.clusters.get", "READ", "LOW"],
      ["List Artifact Registry repos", "artifactregistry.repositories.list", "READ", "LOW"],
      ["Get Artifact Registry repo", "artifactregistry.repositories.get", "READ", "LOW"],
      ["List Artifact Registry packages", "artifactregistry.packages.list", "READ", "LOW"],
      ["Get Artifact Registry repo IAM policy", "artifactregistry.repositories.getIamPolicy", "READ", "LOW"],
      ["List container vulnerability reports", "ondemandscanning.operations.list", "READ", "LOW"],
      ["Get Artifact Analysis occurrence", "containeranalysis.occurrences.list", "READ", "LOW"],
      ["Get Binary Authorization policy", "binaryauthorization.policy.get", "READ", "LOW"],
      ["Update GKE cluster", "container.clusters.update", "WRITE", "HIGH"],
      ["Update Binary Authorization policy", "binaryauthorization.policy.update", "WRITE", "HIGH"],
      ["Delete Artifact Registry package", "artifactregistry.packages.delete", "WRITE", "HIGH"],
    ]),
  },
  {
    num: 7, title: "Network Security",
    subtitle: "VPC firewall rules, Cloud Armor, DNS, VPC Flow Logs, Cloud NAT, load balancers, hierarchical policies",
    ops: mkOps(7, [
      ["List firewall rules", "compute.firewalls.list", "READ", "LOW"],
      ["Get firewall rule", "compute.firewalls.get", "READ", "LOW"],
      ["List VPC networks", "compute.networks.list", "READ", "LOW"],
      ["Get VPC network", "compute.networks.get", "READ", "LOW"],
      ["List subnetworks", "compute.subnetworks.list", "READ", "LOW"],
      ["Get subnetwork", "compute.subnetworks.get", "READ", "LOW"],
      ["List VPC Flow Logs config", "compute.subnetworks.get", "READ", "LOW"],
      ["List Cloud Armor security policies", "compute.securityPolicies.list", "READ", "LOW"],
      ["Get Cloud Armor policy", "compute.securityPolicies.get", "READ", "LOW"],
      ["List cloud NAT configs", "compute.routers.list", "READ", "LOW"],
      ["List load balancers", "compute.forwardingRules.list", "READ", "LOW"],
      ["List DNS zones", "dns.managedZones.list", "READ", "LOW"],
      ["List hierarchical firewall policies", "compute.firewallPolicies.list", "READ", "LOW"],
      ["Get Cloud IDS endpoints", "ids.endpoints.list", "READ", "LOW"],
      ["Create/update firewall rule", "compute.firewalls.create", "WRITE", "HIGH"],
      ["Delete firewall rule", "compute.firewalls.delete", "WRITE", "HIGH"],
      ["Update Cloud Armor policy", "compute.securityPolicies.update", "WRITE", "HIGH"],
      ["Enable VPC flow logs", "compute.subnetworks.update", "WRITE", "MEDIUM"],
    ]),
  },
  {
    num: 8, title: "Threat Detection (CDR)",
    subtitle: "SCC threat findings, Event Threat Detection, Cloud IDS, audit logs, DNS logs, SIEM export",
    ops: mkOps(8, [
      ["List SCC findings", "securitycenter.findings.list", "READ", "LOW"],
      ["Get SCC finding", "securitycenter.findings.get", "READ", "LOW"],
      ["List Event Threat Detection sources", "securitycenter.sources.list", "READ", "LOW"],
      ["List Cloud IDS threat entries", "ids.endpoints.list", "READ", "LOW"],
      ["Get Cloud IDS endpoint", "ids.endpoints.get", "READ", "LOW"],
      ["List log entries (audit/threat)", "logging.logEntries.list", "READ", "LOW"],
      ["Get Chronicle alert", "Chronicle API", "READ", "LOW"],
      ["List DNS logs", "dns.responsePolicies.list", "READ", "LOW"],
      ["Export findings to SIEM", "securitycenter.findings.group", "READ", "LOW"],
      ["Update SCC finding state", "securitycenter.findings.update", "WRITE", "MEDIUM"],
      ["Mute SCC finding", "securitycenter.findings.setMute", "WRITE", "LOW"],
      ["Create log sink (SIEM export)", "logging.sinks.create", "WRITE", "MEDIUM"],
    ]),
  },
  {
    num: 9, title: "IaC & DevSecOps",
    subtitle: "Cloud Deployment Manager, Cloud Build triggers, Cloud Deploy pipelines, Config Connector",
    ops: mkOps(9, [
      ["List Deployment Manager deployments", "deploymentmanager.deployments.list", "READ", "LOW"],
      ["Get deployment", "deploymentmanager.deployments.get", "READ", "LOW"],
      ["List Cloud Build triggers", "cloudbuild.builds.list", "READ", "LOW"],
      ["Get Cloud Build build", "cloudbuild.builds.get", "READ", "LOW"],
      ["List Cloud Deploy pipelines", "clouddeploy.deliveryPipelines.list", "READ", "LOW"],
      ["Get Cloud Deploy release", "clouddeploy.releases.get", "READ", "LOW"],
      ["Get Config Connector config", "container.configMaps.get", "READ", "LOW"],
      ["Create Cloud Build trigger", "cloudbuild.builds.create", "WRITE", "MEDIUM"],
      ["Approve Cloud Deploy rollout", "clouddeploy.rollouts.approve", "WRITE", "HIGH"],
      ["Cancel Cloud Build", "cloudbuild.builds.cancel", "WRITE", "LOW"],
    ]),
  },
  {
    num: 10, title: "Supply Chain & SBOM",
    subtitle: "Artifact Analysis, Artifact Registry, Binary Authorization, SLSA provenance, Software Delivery Shield",
    ops: mkOps(10, [
      ["List Artifact Analysis occurrences", "containeranalysis.occurrences.list", "READ", "LOW"],
      ["Get Artifact Analysis occurrence", "containeranalysis.occurrences.get", "READ", "LOW"],
      ["List Artifact Registry packages", "artifactregistry.packages.list", "READ", "LOW"],
      ["Get package version", "artifactregistry.versions.get", "READ", "LOW"],
      ["List Artifact Registry tags", "artifactregistry.tags.list", "READ", "LOW"],
      ["Get Software Delivery Shield insights", "clouddeploy.deliveryPipelines.get", "READ", "LOW"],
      ["Get Binary Authorization policy", "binaryauthorization.policy.get", "READ", "LOW"],
      ["Get Binary Authorization attestors", "binaryauthorization.attestors.list", "READ", "LOW"],
      ["Get SLSA provenance attestation", "containeranalysis.occurrences.get", "READ", "LOW"],
      ["Update Binary Authorization policy", "binaryauthorization.policy.update", "WRITE", "HIGH"],
      ["Create attestation", "containeranalysis.occurrences.create", "WRITE", "MEDIUM"],
      ["Delete Artifact Registry package", "artifactregistry.packages.delete", "WRITE", "HIGH"],
    ]),
  },
  {
    num: 11, title: "Secrets Detection",
    subtitle: "Secret Manager metadata, DLP inspect jobs and findings, Artifact Analysis secret occurrences",
    ops: mkOps(11, [
      ["List Secret Manager secrets", "secretmanager.secrets.list", "READ", "LOW"],
      ["Get Secret Manager secret (metadata)", "secretmanager.secrets.get", "READ", "LOW"],
      ["List secret versions (metadata)", "secretmanager.versions.list", "READ", "LOW"],
      ["Get secret version metadata", "secretmanager.versions.get", "READ", "LOW"],
      ["Get SCC leaked credential findings", "securitycenter.findings.list", "READ", "LOW"],
      ["Scan for secrets (Cloud DLP)", "dlp.inspectTemplates.list", "READ", "LOW"],
      ["List DLP inspect findings", "dlp.jobTriggers.list", "READ", "LOW"],
      ["Get DLP job result", "dlp.dlpJobs.get", "READ", "LOW"],
      ["List Artifact Analysis secret occurrences", "containeranalysis.occurrences.list", "READ", "LOW"],
      ["Add secret version", "secretmanager.versions.add", "WRITE", "HIGH"],
      ["Disable secret version", "secretmanager.versions.disable", "WRITE", "HIGH"],
      ["Destroy secret version", "secretmanager.versions.destroy", "WRITE", "HIGH"],
      ["Create DLP inspect job", "dlp.dlpJobs.create", "WRITE", "MEDIUM"],
    ]),
  },
  {
    num: 12, title: "API Security",
    subtitle: "Apigee organizations, proxies, analytics, Cloud Endpoints, Cloud Armor L7 policies",
    ops: mkOps(12, [
      ["List Apigee organizations", "apigee.organizations.get", "READ", "LOW"],
      ["List Apigee environments", "apigee.environments.list", "READ", "LOW"],
      ["List Apigee API proxies", "apigee.proxies.list", "READ", "LOW"],
      ["Get Apigee proxy deployment", "apigee.deployments.list", "READ", "LOW"],
      ["List Apigee developers", "apigee.developers.list", "READ", "LOW"],
      ["List Apigee apps", "apigee.apps.list", "READ", "LOW"],
      ["Get Apigee analytics data", "apigee.analyticsdata.get", "READ", "LOW"],
      ["List Cloud Endpoints services", "servicemanagement.services.list", "READ", "LOW"],
      ["Get Cloud Endpoint rollout", "servicemanagement.services.get", "READ", "LOW"],
      ["Get Cloud Armor security policy", "compute.securityPolicies.get", "READ", "LOW"],
      ["Update Apigee proxy", "apigee.proxies.create", "WRITE", "HIGH"],
      ["Update Cloud Armor policy", "compute.securityPolicies.update", "WRITE", "HIGH"],
      ["Deploy Apigee proxy", "apigee.deployments.create", "WRITE", "HIGH"],
    ]),
  },
  {
    num: 13, title: "Data Security (DSPM)",
    subtitle: "Cloud Storage, Cloud SQL, BigQuery, Spanner, Bigtable, DLP classification, KMS encryption",
    ops: mkOps(13, [
      ["List Cloud Storage buckets", "storage.buckets.list", "READ", "LOW"],
      ["Get bucket IAM policy", "storage.buckets.getIamPolicy", "READ", "LOW"],
      ["Get bucket metadata", "storage.buckets.get", "READ", "LOW"],
      ["List Cloud SQL instances", "cloudsql.instances.list", "READ", "LOW"],
      ["Get Cloud SQL instance", "cloudsql.instances.get", "READ", "LOW"],
      ["Get Cloud SQL SSL certs", "cloudsql.sslCerts.list", "READ", "LOW"],
      ["List BigQuery datasets", "bigquery.datasets.get", "READ", "LOW"],
      ["Get BigQuery dataset IAM policy", "bigquery.datasets.getIamPolicy", "READ", "LOW"],
      ["List Spanner instances", "spanner.instances.list", "READ", "LOW"],
      ["Get Spanner instance", "spanner.instances.get", "READ", "LOW"],
      ["List Cloud Bigtable instances", "bigtable.instances.list", "READ", "LOW"],
      ["List DLP inspect templates", "dlp.inspectTemplates.list", "READ", "LOW"],
      ["Get DLP job results", "dlp.dlpJobs.get", "READ", "LOW"],
      ["List KMS key rings", "cloudkms.keyRings.list", "READ", "LOW"],
      ["List KMS crypto keys", "cloudkms.cryptoKeys.list", "READ", "LOW"],
      ["Set bucket IAM policy", "storage.buckets.setIamPolicy", "WRITE", "HIGH"],
      ["Update Cloud SQL instance", "cloudsql.instances.update", "WRITE", "HIGH"],
      ["Create DLP job", "dlp.dlpJobs.create", "WRITE", "MEDIUM"],
      ["Create KMS key", "cloudkms.cryptoKeys.create", "WRITE", "MEDIUM"],
    ]),
  },
  {
    num: 14, title: "SaaS Security (SSPM)",
    subtitle: "Google Workspace users, groups, OAuth tokens, third-party apps, Cloud Identity groups",
    ops: mkOps(14, [
      ["List Workspace users", "admin.directory.user.readonly", "READ", "LOW"],
      ["List Workspace groups", "admin.directory.group.readonly", "READ", "LOW"],
      ["List Workspace devices", "admin.directory.device.chromeos.readonly", "READ", "LOW"],
      ["Read Workspace domain settings", "admin.directory.domain.readonly", "READ", "LOW"],
      ["Read Workspace OAuth tokens", "admin.directory.tokens.readonly", "READ", "LOW"],
      ["Read Workspace third-party app access", "admin.directory.userschema.readonly", "READ", "LOW"],
      ["Read Workspace Security Center reports", "admin.reports.audit.readonly", "READ", "LOW"],
      ["Read Workspace login activity", "admin.reports.usage.readonly", "READ", "LOW"],
      ["List GCP Cloud Identity groups", "cloudidentity.groups.list", "READ", "LOW"],
      ["List Workspace Marketplace apps", "Admin SDK marketplace", "READ", "LOW"],
      ["Revoke Workspace OAuth token", "admin.directory.tokens.delete", "WRITE", "HIGH"],
      ["Suspend Workspace user", "admin.directory.user.update", "WRITE", "HIGH"],
      ["Remove third-party app access", "admin.directory.userschema.delete", "WRITE", "HIGH"],
    ]),
  },
  {
    num: 15, title: "AI Security Posture (AI-SPM)",
    subtitle: "Vertex AI models, endpoints, datasets, training jobs, Model Armor templates, DLP on training data",
    ops: mkOps(15, [
      ["List Vertex AI models", "aiplatform.models.list", "READ", "LOW"],
      ["Get Vertex AI model", "aiplatform.models.get", "READ", "LOW"],
      ["List Vertex AI endpoints", "aiplatform.endpoints.list", "READ", "LOW"],
      ["Get Vertex AI endpoint", "aiplatform.endpoints.get", "READ", "LOW"],
      ["List Vertex AI datasets", "aiplatform.datasets.list", "READ", "LOW"],
      ["Get Vertex AI dataset", "aiplatform.datasets.get", "READ", "LOW"],
      ["List Vertex AI training jobs", "aiplatform.trainingPipelines.list", "READ", "LOW"],
      ["Get Vertex AI pipeline", "aiplatform.pipelineJobs.get", "READ", "LOW"],
      ["List Vertex AI feature stores", "aiplatform.featurestores.list", "READ", "LOW"],
      ["List Vertex AI Agent Engine deployments", "aiplatform.agents.list", "READ", "LOW"],
      ["Get Model Armor template", "modelarmor.templates.get", "READ", "LOW"],
      ["List Model Armor templates", "modelarmor.templates.list", "READ", "LOW"],
      ["Get SCC AI threat findings", "securitycenter.findings.list", "READ", "LOW"],
      ["Get DLP results on training data", "dlp.dlpJobs.get", "READ", "LOW"],
      ["Update Model Armor template", "modelarmor.templates.update", "WRITE", "HIGH"],
      ["Delete Vertex AI endpoint", "aiplatform.endpoints.delete", "WRITE", "HIGH"],
      ["Undeploy Vertex AI model", "aiplatform.endpoints.undeploy", "WRITE", "HIGH"],
      ["Stop Vertex AI training pipeline", "aiplatform.trainingPipelines.cancel", "WRITE", "MEDIUM"],
    ]),
  },
];

/* ─── Connector data ─── */

const CONNECTORS: Connector[] = [
  {
    id: "aws-prod", name: "AWS Production", cloud: "AWS", status: "connected",
    description: "Cross-account read access to your AWS production environment. CloudGuard uses an IAM role with least-privilege inline policies per CNAPP layer to enumerate resources, stream CloudTrail events, and optionally remediate findings.",
    cnappLayers: AWS_LAYERS,
    credential: {
      type: "IAM Role", label: "Cross-account IAM Role",
      fields: [
        { label: "Role ARN", value: "arn:aws:iam::123456789012:role/CloudGuardAuditRole", masked: false },
        { label: "External ID", value: "cg-ext-••••••••••••••••", masked: true },
        { label: "Region", value: "us-east-1", masked: false },
      ],
    },
    accounts: [
      { id: "123456789012", label: "prod-main", region: "us-east-1", status: "active" },
      { id: "234567890123", label: "prod-eu", region: "eu-west-1", status: "active" },
      { id: "345678901234", label: "prod-apac", region: "ap-southeast-1", status: "active" },
    ],
  },
  {
    id: "azure-eu", name: "Azure EU", cloud: "Azure", status: "connected",
    description: "Service principal with Reader + Security Reader roles scoped to your EU subscriptions. CloudGuard uses Microsoft Graph, ARM, and Defender for Cloud APIs across all 15 CNAPP layers.",
    cnappLayers: AZURE_LAYERS,
    credential: {
      type: "Service Principal", label: "Azure Service Principal",
      fields: [
        { label: "Tenant ID", value: "9f8e7d6c-5b4a-3210-fedc-ba9876543210", masked: false },
        { label: "Client ID", value: "a1b2c3d4-e5f6-7890-abcd-ef1234567890", masked: false },
        { label: "Client Secret", value: "cg-sp-••••••••••••••••••••••", masked: true },
      ],
    },
    accounts: [
      { id: "sub-eu-prod-001", label: "EU Production", region: "westeurope", status: "active" },
      { id: "sub-eu-staging-001", label: "EU Staging", region: "northeurope", status: "active" },
    ],
  },
  {
    id: "gcp-dev", name: "GCP Dev", cloud: "GCP", status: "connected",
    description: "Workload Identity federation with a service account bound to Security Reviewer and Viewer roles at organization level. CloudGuard uses Cloud Asset Inventory and Security Command Center APIs across all 15 CNAPP layers.",
    cnappLayers: GCP_LAYERS,
    credential: {
      type: "Workload Identity", label: "GCP Service Account (WIF)",
      fields: [
        { label: "Project ID", value: "my-company-dev-482910", masked: false },
        { label: "Service Account", value: "cloudguard-audit@my-company-dev-482910.iam.gserviceaccount.com", masked: false },
        { label: "WIF Pool", value: "projects/482910/locations/global/workloadIdentityPools/cg-pool", masked: false },
      ],
    },
    accounts: [
      { id: "my-company-dev-482910", label: "Dev Project", region: "us-central1", status: "active" },
      { id: "my-company-sandbox-183746", label: "Sandbox Project", region: "us-central1", status: "inactive" },
    ],
  },
];

/* ─── UI helpers ─── */

function StatusDot({ status }: { status: Connector["status"] | "active" | "inactive" }) {
  const color = status === "connected" || status === "active" ? S.success : status === "error" ? S.danger : S.warning;
  return <span style={{ width: 7, height: 7, borderRadius: "50%", background: color, display: "inline-block", flexShrink: 0 }} />;
}

function RiskBadge({ risk }: { risk: Risk }) {
  const fg: Record<Risk, string> = { LOW: S.success, MEDIUM: S.warning, HIGH: S.danger };
  return (
    <span style={{ fontSize: 9, fontWeight: 600, color: fg[risk], fontFamily: "monospace", letterSpacing: "0.04em" }}>
      {risk}
    </span>
  );
}

function TypeBadge({ opType }: { opType: OpType }) {
  return (
    <span style={{ fontSize: 9, fontWeight: 600, color: opType === "READ" ? S.accent : S.warning, fontFamily: "monospace", letterSpacing: "0.04em" }}>
      {opType}
    </span>
  );
}

function PermToggle({ state, onChange }: { state: PermState; onChange: (s: PermState) => void }) {
  const STATES: PermState[] = ["allow", "ask", "never"];
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {STATES.map(s => {
        const active = state === s;
        const color = s === "allow" ? S.success : s === "ask" ? S.warning : S.danger;
        const bg = active ? (s === "allow" ? "rgba(76,175,125,0.15)" : s === "ask" ? "rgba(224,154,45,0.15)" : "rgba(224,82,82,0.15)") : "transparent";
        return (
          <button key={s} type="button" onClick={() => onChange(s)}
            title={s === "allow" ? "Always allow" : s === "ask" ? "Ask each time" : "Never allow"}
            style={{ width: 26, height: 26, borderRadius: 5, border: `1px solid ${active ? color : S.border}`, background: bg,
              display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 120ms ease" }}>
            {s === "allow" && <CheckCircle2 size={12} color={active ? S.success : S.textMuted} />}
            {s === "ask" && <Eye size={12} color={active ? S.warning : S.textMuted} />}
            {s === "never" && <Ban size={12} color={active ? S.danger : S.textMuted} />}
          </button>
        );
      })}
    </div>
  );
}

/* ─── Layer accordion section (AWS only) ─── */

function LayerSection({ layer, connId, perms, setPerm }: {
  layer: CnappLayer;
  connId: string;
  perms: Record<string, PermState>;
  setPerm: (key: string, s: PermState) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const readCount = layer.ops.filter(o => o.opType === "READ").length;
  const writeCount = layer.ops.filter(o => o.opType === "WRITE").length;

  return (
    <div style={{ borderRadius: 8, border: `1px solid ${S.border}`, overflow: "hidden", marginBottom: 8 }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
          background: open ? "var(--cg-bg-card)" : "transparent", border: "none", cursor: "pointer", textAlign: "left",
          transition: "background 100ms" }}
      >
        <span style={{ fontSize: 11, fontWeight: 700, color: S.textMuted, width: 20, textAlign: "center", flexShrink: 0 }}>
          {layer.num}
        </span>
        <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: S.textPrimary }}>{layer.title}</span>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, background: "rgba(45,134,212,0.12)", color: S.accent, fontWeight: 600 }}>
            {readCount} READ
          </span>
          <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, background: "rgba(224,154,45,0.12)", color: S.warning, fontWeight: 600 }}>
            {writeCount} WRITE
          </span>
          <ChevronDown size={13} color={S.textMuted}
            style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 180ms ease", flexShrink: 0 }} />
        </div>
      </button>

      {open && (
        <div>
          <div style={{ padding: "6px 14px 10px", borderTop: `1px solid ${S.border}` }}>
            <p style={{ fontSize: 12, color: S.textMuted, margin: 0 }}>{layer.subtitle}</p>
          </div>
          <div style={{ borderTop: `1px solid ${S.border}` }}>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr 62px 56px 90px", padding: "7px 14px",
              borderBottom: `1px solid ${S.border}`, background: "var(--cg-bg-page)" }}>
              {["Operation", "Permission String", "Type", "Risk", "Allow"].map(h => (
                <span key={h} style={{ fontSize: 10, fontWeight: 600, color: S.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", minWidth: 0, overflow: "hidden" }}>{h}</span>
              ))}
            </div>
            {layer.ops.map((op, i) => {
              const permKey = `${connId}::L${layer.num}::${op.key}`;
              const cur = perms[permKey] ?? op.defaultState;
              return (
                <div key={op.key} style={{ display: "grid", gridTemplateColumns: "2fr 2fr 62px 56px 90px",
                  padding: "8px 14px", alignItems: "center",
                  borderBottom: i < layer.ops.length - 1 ? `1px solid var(--cg-border-subtle)` : "none",
                  background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)" }}>
                  <span style={{ fontSize: 12, color: S.textSecondary, paddingRight: 8, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{op.label}</span>
                  <span style={{ fontSize: 11, color: S.textMuted, fontFamily: "monospace", paddingRight: 8, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{op.action}</span>
                  <div style={{ minWidth: 0, overflow: "hidden" }}><TypeBadge opType={op.opType} /></div>
                  <div style={{ minWidth: 0, overflow: "hidden" }}><RiskBadge risk={op.risk} /></div>
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <PermToggle state={cur} onChange={s => setPerm(permKey, s)} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Page ─── */

export default function ConnectorsSettings() {
  const [selected, setSelected] = React.useState<string>(CONNECTORS[0].id);
  const [perms, setPerms] = React.useState<Record<string, PermState>>(() => {
    const init: Record<string, PermState> = {};
    for (const c of CONNECTORS) {
      if (c.cnappLayers) {
        for (const layer of c.cnappLayers)
          for (const op of layer.ops)
            init[`${c.id}::L${layer.num}::${op.key}`] = op.defaultState;
      }
      if (c.permGroups) {
        for (const g of c.permGroups)
          for (const p of g.permissions)
            init[`${c.id}::${p.key}`] = p.state;
      }
    }
    return init;
  });

  const connector = CONNECTORS.find(c => c.id === selected)!;
  const setPerm = (key: string, state: PermState) => setPerms(p => ({ ...p, [key]: state }));

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      {/* Left panel */}
      <div style={{ width: 240, flexShrink: 0, borderRight: `1px solid ${S.border}`, background: S.navBg,
        display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "24px 16px 12px", fontSize: 11, fontWeight: 600, color: S.textMuted, textTransform: "uppercase", letterSpacing: "0.07em" }}>
          Cloud Providers
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {CONNECTORS.map(c => {
            const active = c.id === selected;
            return (
              <button key={c.id} type="button" onClick={() => setSelected(c.id)}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 14px",
                  background: active ? "var(--cg-bg-active)" : "transparent", border: "none", cursor: "pointer",
                  textAlign: "left", transition: "background 100ms", boxSizing: "border-box" }}>
                <div style={{ width: 28, height: 28, borderRadius: 6, background: S.iconBg, border: `1px solid ${S.border}`,
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
                  <CloudIcon cloud={c.cloud} size={18} uid={`nav-${c.id}`} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: active ? S.textPrimary : S.textSecondary, fontWeight: active ? 500 : 400,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</div>
                </div>
                <StatusDot status={c.status} />
              </button>
            );
          })}
        </div>
        <div style={{ padding: "12px 14px", borderTop: `1px solid ${S.border}` }}>
          <button type="button" style={{ width: "100%", height: 34, borderRadius: 6, background: "transparent",
            border: `1px dashed ${S.borderStrong}`, color: S.textSecondary, fontSize: 12, cursor: "pointer" }}>
            + Add connector
          </button>
        </div>
      </div>

      {/* Right detail panel */}
      <div style={{ flex: 1, overflowY: "auto", padding: "32px 40px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: S.iconBg, border: `1px solid ${S.border}`,
              display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
              <CloudIcon cloud={connector.cloud} size={28} uid={`hdr-${connector.id}`} />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 500, color: S.textPrimary }}>{connector.name}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                <StatusDot status={connector.status} />
                <span style={{ fontSize: 12, color: S.textMuted, textTransform: "capitalize" }}>{connector.status}</span>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" style={{ height: 32, padding: "0 12px", borderRadius: 6, background: "transparent",
              border: `1px solid ${S.danger}`, color: S.danger, fontSize: 12, cursor: "pointer" }}>Disconnect</button>
            <button type="button" style={{ height: 32, width: 32, borderRadius: 6, background: "transparent",
              border: `1px solid ${S.border}`, color: S.textMuted, fontSize: 16, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center" }}>···</button>
          </div>
        </div>

        <p style={{ fontSize: 13, color: S.textMuted, marginTop: 0, marginBottom: 24, lineHeight: 1.6 }}>{connector.description}</p>

        {/* AWS: 15-layer accordion */}
        {connector.cnappLayers && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <h2 style={{ fontSize: 13, fontWeight: 600, color: S.textPrimary, margin: 0 }}>Permissions — All 15 CNAPP Layers</h2>
              <div style={{ display: "flex", gap: 12 }}>
                {[
                  { icon: <CheckCircle2 size={11} color={S.success} />, label: "Always allow" },
                  { icon: <Eye size={11} color={S.warning} />, label: "Ask each time" },
                  { icon: <Ban size={11} color={S.danger} />, label: "Never" },
                ].map(l => (
                  <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    {l.icon}
                    <span style={{ fontSize: 11, color: S.textMuted }}>{l.label}</span>
                  </div>
                ))}
              </div>
            </div>
            {connector.cnappLayers.map(layer => (
              <LayerSection key={layer.num} layer={layer} connId={connector.id} perms={perms} setPerm={setPerm} />
            ))}
          </div>
        )}

        {/* Azure / GCP: simple permission groups */}
        {connector.permGroups && connector.permGroups.map(group => (
          <div key={group.title} style={{ marginBottom: 28 }}>
            <div style={{ marginBottom: 14 }}>
              <h2 style={{ fontSize: 13, fontWeight: 600, color: S.textPrimary, margin: 0 }}>{group.title}</h2>
              <p style={{ fontSize: 12, color: S.textMuted, margin: "3px 0 0" }}>{group.sublabel}</p>
            </div>
            <div style={{ borderRadius: 8, border: `1px solid ${S.border}`, overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 120px", padding: "8px 16px", borderBottom: `1px solid ${S.border}` }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: S.textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>Operation</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: S.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "right" }}>Permission</span>
              </div>
              {group.permissions.map((p, i) => {
                const permKey = `${connector.id}::${p.key}`;
                const cur = perms[permKey] ?? p.state;
                return (
                  <div key={p.key} style={{ display: "grid", gridTemplateColumns: "1fr 120px", padding: "10px 16px",
                    borderBottom: i < group.permissions.length - 1 ? "1px solid var(--cg-border-subtle)" : "none", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 13, color: S.textSecondary }}>{p.label}</div>
                      {p.sublabel && <div style={{ fontSize: 12, color: S.textMuted, marginTop: 1 }}>{p.sublabel}</div>}
                    </div>
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <PermToggle state={cur} onChange={s => setPerm(permKey, s)} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Credential card */}
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: S.textPrimary, marginTop: 0, marginBottom: 14 }}>Credentials</h2>
          <div style={{ background: S.cardBg, border: `1px solid ${S.border}`, borderRadius: 8, padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div>
                <span style={{ fontSize: 13, fontWeight: 500, color: S.textPrimary }}>{connector.credential.label}</span>
                <span style={{ fontSize: 11, color: S.textMuted, marginLeft: 8 }}>{connector.credential.type}</span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" style={{ height: 26, padding: "0 10px", borderRadius: 4, background: "transparent",
                  border: `1px solid ${S.borderStrong}`, color: S.textSecondary, fontSize: 11, cursor: "pointer" }}>Rotate</button>
                <button type="button" style={{ height: 26, padding: "0 10px", borderRadius: 4, background: "transparent",
                  border: "1px solid rgba(224,82,82,0.4)", color: S.danger, fontSize: 11, cursor: "pointer" }}>Remove</button>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {connector.credential.fields.map(f => (
                <div key={f.label} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  <span style={{ fontSize: 11, color: S.textMuted }}>{f.label}</span>
                  <span style={{ fontSize: 12, color: f.masked ? S.textMuted : S.textSecondary, fontFamily: "monospace", wordBreak: "break-all" }}>{f.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Accounts table */}
        <div>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: S.textPrimary, marginTop: 0, marginBottom: 14 }}>
            {connector.cloud === "AWS" ? "Accounts" : connector.cloud === "Azure" ? "Subscriptions" : "Projects"}
          </h2>
          <div style={{ borderRadius: 8, border: `1px solid ${S.border}`, overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 80px", padding: "8px 16px", borderBottom: `1px solid ${S.border}` }}>
              {["ID", "Name", "Region", "Status"].map(h => (
                <span key={h} style={{ fontSize: 11, fontWeight: 600, color: S.textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</span>
              ))}
            </div>
            {connector.accounts.map((a, i) => (
              <div key={a.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 80px", padding: "10px 16px",
                borderBottom: i < connector.accounts.length - 1 ? "1px solid var(--cg-border-subtle)" : "none", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: S.textMuted, fontFamily: "monospace" }}>{a.id}</span>
                <span style={{ fontSize: 13, color: S.textSecondary }}>{a.label}</span>
                <span style={{ fontSize: 12, color: S.textMuted }}>{a.region ?? "—"}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <StatusDot status={a.status} />
                  <span style={{ fontSize: 12, color: a.status === "active" ? S.success : S.textMuted, textTransform: "capitalize" }}>{a.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

#!/usr/bin/env python3
"""
Scaffold the v3 AWS skill directory structure.

Creates the full 99-skill catalog from registry/p*.md as empty stubs:

  cloudguard-runtime/skills/aws/{ciem,nhi,cspm,compliance,cwpp,kspm,
                                  network,cdr,devsecops,supply-chain,
                                  secrets,api,dspm,sspm,ai-spm}/{slug}/SKILL.md

Each stub has:
  - Correct frontmatter (name, version, provider, category, service, context,
    description from the v3 spec, requires)
  - Body with TODO placeholders that point at SKILL_TEMPLATE.md
  - Validation passes in non-strict mode; --strict fails until content is filled

Three skills are created as aliases (canonical: false, alias_of: ...):
  - aws/kspm/eks-irsa-security      → aws:nhi/irsa-binding-audit
  - aws/api/waf-assessment          → aws:network/waf-assessment
  - aws/secrets/ssm-parameter-security → aws:devsecops/ssm-parameter-security

Idempotent: re-running skips existing SKILL.md files. Use --force to overwrite.

Usage:
    # Dry-run (default — prints planned operations)
    python scripts/scaffold_v3_aws_structure.py

    # Execute
    python scripts/scaffold_v3_aws_structure.py --write

    # Custom target root
    python scripts/scaffold_v3_aws_structure.py --write \
        --root /path/to/cloudguard-runtime/skills

    # Overwrite existing stubs (DESTRUCTIVE)
    python scripts/scaffold_v3_aws_structure.py --write --force
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

# ── 99-skill v3 manifest (extracted from registry/p*.md) ────────────────────
#
# Format per entry:
#   slug → (description_one_liner, service_hint_or_None)
# A `service` of None means cross-cutting (e.g. data-residency-audit) or
# multi-service (e.g. compliance) — the frontmatter omits the service field.

V3_AWS_SKILLS: dict[str, dict[str, tuple[str, str | None]]] = {
    "ciem": {
        "iam-entity-audit": (
            "Human identity hygiene — credential state, MFA, password policy, policy attachment patterns.",
            "iam",
        ),
        "iam-unused-access": (
            "Permission right-sizing via IAM Access Advisor telemetry — granted permissions never used.",
            "iam",
        ),
        "iam-access-analyzer-external": (
            "IAM Access Analyzer ACCOUNT and ORGANIZATION type analyzers — resources accessible from outside the account/org.",
            "access-analyzer",
        ),
        "iam-access-analyzer-unused": (
            "IAM Access Analyzer ACCOUNT_UNUSED_ACCESS type — stale credentials and unused permissions.",
            "access-analyzer",
        ),
        "iam-policy-analysis": (
            "Effective permission computation — intersection of SCPs + permission boundaries + identity + resource + session policies.",
            "iam",
        ),
        "privilege-escalation-paths": (
            "Graph-based IAM privilege escalation chain detection — permission combinations allowing self-privilege increase.",
            "iam",
        ),
        "permission-boundaries": (
            "Permission boundary attachment and escape detection — which roles can create new principals without boundary inheritance.",
            "iam",
        ),
        "scp-guardrails": (
            "AWS Organizations Service Control Policies — org-level preventive controls above the IAM layer.",
            "organizations",
        ),
        "iam-identity-center": (
            "AWS IAM Identity Center — permission sets, account assignments, external IdP configuration.",
            "sso",
        ),
        "cross-account-trust": (
            "Inbound trust analysis — external principals that can assume roles or access resources. Confused deputy detection.",
            "iam",
        ),
        "sts-token-analysis": (
            "Temporary credential session security — duration limits, chaining depth, web identity conditions.",
            "sts",
        ),
    },
    "nhi": {
        "iam-access-key-lifecycle": (
            "Long-lived programmatic credentials on IAM users — age, rotation, multi-key state.",
            "iam",
        ),
        "workload-identity-profiles": (
            "IAM roles attached to compute workloads — EC2 instance profiles, ECS/Fargate task roles, Batch, AppRunner.",
            "iam",
        ),
        "service-linked-roles-audit": (
            "AWS-managed SLRs — machine identities created by AWS on your behalf when enabling services.",
            "iam",
        ),
        "oidc-federation-trust": (
            "OIDC provider registrations at the account level — the trust anchors themselves.",
            "iam",
        ),
        "irsa-binding-audit": (
            "EKS IRSA — binding between Kubernetes service accounts and IAM roles via OIDC. Canonical home.",
            "eks",
        ),
        "cicd-oidc-trust": (
            "CI/CD OIDC roles — GitHub Actions, GitLab CI, CircleCI, Bitbucket Pipelines via AssumeRoleWithWebIdentity.",
            "iam",
        ),
        "aws-marketplace-third-party": (
            "Third-party software from AWS Marketplace granted IAM access roles — vendor-onboarded machine identities.",
            "iam",
        ),
    },
    "cspm": {
        "cis-benchmarks": (
            "CIS AWS Foundations Benchmark automated runner (Level 1 + Level 2). Scored report mapped to CIS control IDs.",
            None,
        ),
        "account-baseline-hardening": (
            "AWS account root-level and account-level settings. Account config, not resource config.",
            None,
        ),
        "ec2-security": (
            "EC2 instance and volume configuration state.",
            "ec2",
        ),
        "rds-security": (
            "RDS and Aurora instance/cluster configuration — AWS-specific knobs only.",
            "rds",
        ),
        "cloudfront-security": (
            "CloudFront distribution security configuration.",
            "cloudfront",
        ),
        "elasticache-security": (
            "ElastiCache Redis and Memcached cluster configuration.",
            "elasticache",
        ),
        "opensearch-security": (
            "OpenSearch Service domain configuration.",
            "es",
        ),
        "sns-sqs-exposure": (
            "SQS queue and SNS topic resource policies — public and cross-account access.",
            None,
        ),
        "cross-service-exposure-map": (
            "Read-only inventory of all publicly exposed endpoints across account. Aggregation skill — inventory, not per-resource findings.",
            None,
        ),
        "s3-block-public-access": (
            "S3 Block Public Access settings — account-level and bucket-level configuration. Infrastructure config, not data access control.",
            "s3",
        ),
    },
    "compliance": {
        "compliance": (
            "Framework mapping and evidence collection — maps findings to PCI-DSS, HIPAA, SOC2, ISO27001, NIST 800-53.",
            None,
        ),
        "config-rules-audit": (
            "AWS Config rule coverage and compliance state — whether detection mechanism is deployed, not whether resources are misconfigured.",
            "config",
        ),
        "control-tower-guardrails": (
            "AWS Control Tower landing zone health and guardrail status.",
            "controltower",
        ),
        "resource-tagging-compliance": (
            "Tag policy enforcement for security-relevant tags — DataClassification, Environment, Owner, CostCenter.",
            "resourcegroupstaggingapi",
        ),
    },
    "cwpp": {
        "ssm-patch-compliance": (
            "SSM Patch Manager compliance state. AWS SSM constructs only.",
            "ssm",
        ),
        "lambda-security": (
            "Lambda function configuration security — runtime, exposure, resource-based policy.",
            "lambda",
        ),
        "ecs-task-security": (
            "ECS task definition security — secrets handling, container privileges, logging.",
            "ecs",
        ),
        "fargate-security": (
            "Fargate-specific runtime security — ephemeral ENIs, task-level security groups, platform version.",
            "ecs",
        ),
        "ami-hardening": (
            "AMI supply chain — images that become EC2 instances. Pre-runtime, supply-chain concern.",
            "ec2",
        ),
        "inspector-findings": (
            "Amazon Inspector v2 deployment state and finding management.",
            "inspector2",
        ),
        "elastic-beanstalk-security": (
            "Elastic Beanstalk environment and platform security configuration.",
            "elasticbeanstalk",
        ),
        "step-functions-security": (
            "Step Functions state machine IAM, execution logging, and execution history data exposure.",
            "states",
        ),
    },
    "kspm": {
        "eks-cluster-config": (
            "EKS cluster-level configuration — the cluster object itself.",
            "eks",
        ),
        # eks-irsa-security is an alias — handled separately in ALIASES below
        "eks-pod-security": (
            "Pod Security Standards enforcement at the namespace level. Workload admission policies.",
            "eks",
        ),
        "ecr-security": (
            "ECR repository and registry configuration.",
            "ecr",
        ),
        "ecs-cluster-security": (
            "ECS cluster-level settings only.",
            "ecs",
        ),
    },
    "network": {
        "vpc-security": (
            "VPC configuration objects — security groups, NACLs, flow logs, route tables, endpoints.",
            "ec2",
        ),
        "elb-security": (
            "Application Load Balancer (ALBv2), Network Load Balancer (NLBv2), Classic Load Balancer security.",
            "elasticloadbalancingv2",
        ),
        "waf-assessment": (
            "AWS WAF v2 WebACL rule configuration and coverage. Canonical home — api/waf-assessment is an alias.",
            "wafv2",
        ),
        "network-firewall": (
            "AWS Network Firewall policy and rule group configuration.",
            "network-firewall",
        ),
        "route53-security": (
            "Route53 DNS security — AWS-specific constructs only.",
            "route53",
        ),
        "transit-gateway-security": (
            "TGW routing domain isolation and cross-account attachment security.",
            "ec2",
        ),
        "vpc-endpoint-service-security": (
            "PrivateLink endpoint services — you exposing your services to other VPCs/accounts via PrivateLink.",
            "ec2",
        ),
        "direct-connect-vpn-security": (
            "Direct Connect and Site-to-Site VPN configuration security.",
            "directconnect",
        ),
    },
    "cdr": {
        "logging-audit": (
            "Log existence checks only — is logging configured at all for key services?",
            "cloudtrail",
        ),
        "cloudtrail-integrity": (
            "Can CloudTrail logs be trusted? Tamper detection and log validation.",
            "cloudtrail",
        ),
        "guardduty-findings": (
            "GuardDuty deployment state and finding triage — is detection working and reaching humans?",
            "guardduty",
        ),
        "security-hub-posture": (
            "Security Hub configuration and finding aggregation — set up correctly and routing findings?",
            "securityhub",
        ),
        "cloudwatch-alerting": (
            "CIS Benchmark metric filter and alarm coverage — specific named alarms required by CIS AWS Foundations §4.",
            "cloudwatch",
        ),
    },
    "devsecops": {
        "cloudformation-security": (
            "CloudFormation stack configuration and template security analysis.",
            "cloudformation",
        ),
        "codepipeline-security": (
            "CodePipeline IAM roles, artifact storage, deployment stage security.",
            "codepipeline",
        ),
        "codebuild-security": (
            "CodeBuild project configuration — secrets, container mode, IAM role.",
            "codebuild",
        ),
        "ssm-parameter-security": (
            "SSM Parameter Store — pipeline config usage AND secrets misclassification. Canonical home.",
            "ssm",
        ),
        "codecommit-security": (
            "CodeCommit repository access control and branch protection. Deprecated for new customers July 2024.",
            "codecommit",
        ),
        "codeartifact-security": (
            "CodeArtifact package repository security and supply chain integrity.",
            "codeartifact",
        ),
    },
    "supply-chain": {
        "ecr-sbom-scanning": (
            "Amazon Inspector SBOM generation from ECR images — vulnerabilities in container dependencies.",
            "inspector2",
        ),
        "lambda-layer-trust": (
            "Lambda layers from external accounts — untrusted code executing inside Lambda functions.",
            "lambda",
        ),
        "s3-artifact-integrity": (
            "S3 buckets used as build artifact stores — immutability and tamper prevention.",
            "s3",
        ),
        "aws-signer-profiles": (
            "AWS Signer code signing enforcement for Lambda deployments and IoT.",
            "signer",
        ),
    },
    "secrets": {
        "secrets-manager-audit": (
            "AWS Secrets Manager governance — rotation policy, resource-based access, cross-account exposure, replication state.",
            "secretsmanager",
        ),
        "ec2-userdata-secrets": (
            "EC2 instance user-data field — plaintext credentials passed to instances at boot. IMDSv1-readable.",
            "ec2",
        ),
        "lambda-env-secrets": (
            "Lambda function environment variables — credential patterns stored in plaintext env vars.",
            "lambda",
        ),
        "cloudformation-secrets": (
            "CloudFormation template and parameter value scanning — secrets hardcoded in templates or non-NoEcho parameters.",
            "cloudformation",
        ),
        "s3-secrets-exposure": (
            "Credential patterns in S3 objects — .env files, config dumps, credential archives. Narrow content scan on high-risk key patterns.",
            "s3",
        ),
        # ssm-parameter-security is an alias — handled separately in ALIASES below
    },
    "api": {
        "apigw-rest-security": (
            "API Gateway REST APIs (v1) — authorizer configuration, resource policy, method settings, throttling, usage plans.",
            "apigateway",
        ),
        "apigw-http-security": (
            "API Gateway HTTP APIs (v2) — JWT authorizer configuration, CORS policy, route-level authorization, auto-deploy state.",
            "apigateway",
        ),
        "apigw-websocket-security": (
            "API Gateway WebSocket APIs — $connect / $disconnect route authorization and backend trust.",
            "apigateway",
        ),
        "appsync-security": (
            "AWS AppSync GraphQL API security — authorization mode configuration, request/error logging, field-level authorization.",
            "appsync",
        ),
        "api-gateway-logging": (
            "Access logging and execution logging across all API Gateway API types (REST, HTTP, WebSocket).",
            "apigateway",
        ),
        # waf-assessment is an alias — handled separately in ALIASES below
    },
    "dspm": {
        "s3-exposure": (
            "S3 bucket policy content — cross-account access, public ACLs, presigned URL abuse patterns. Data access layer only.",
            "s3",
        ),
        "s3-encryption-audit": (
            "S3 bucket encryption at rest — default encryption and enforcement via bucket key and deny-unencrypted-put policy.",
            "s3",
        ),
        "macie-classification": (
            "Amazon Macie deployment state and PII classification findings — Macie enabled and sensitive findings actioned?",
            "macie2",
        ),
        "rds-data-security": (
            "RDS data-layer security — at-rest encryption, snapshot exposure, export controls, Secrets Manager rotation integration.",
            "rds",
        ),
        "dynamodb-security": (
            "DynamoDB table encryption, point-in-time recovery, resource-based policy, export controls.",
            "dynamodb",
        ),
        "redshift-security": (
            "Redshift provisioned cluster and Redshift Serverless workgroup security — encryption, audit logging, parameter groups, VPC routing.",
            "redshift",
        ),
        "athena-data-governance": (
            "Athena workgroup security settings — query result encryption, output location enforcement, cross-account data catalog access.",
            "athena",
        ),
        "glue-data-catalog-security": (
            "AWS Glue Data Catalog resource policies, encryption settings, connection password protection, Lake Formation integration.",
            "glue",
        ),
        "kms-key-management": (
            "AWS KMS customer-managed key (CMK) governance — key policy, rotation, deletion scheduling, cross-account grants.",
            "kms",
        ),
        "data-residency-audit": (
            "Data stored outside approved regions — identifies AWS data storage resources with data-at-rest in unapproved regions.",
            None,
        ),
        "backup-security": (
            "AWS Backup vault and plan configuration — backup existence, cross-account vault copy, encryption, vault lock (immutability).",
            "backup",
        ),
        "lake-formation-governance": (
            "AWS Lake Formation permission grants and data lake settings — column/row/table grants, default permission mode, data cell filters.",
            "lakeformation",
        ),
    },
    "sspm": {
        "cognito-identity-security": (
            "Amazon Cognito User Pools and Identity Pools — authentication configuration, unauth role assignment, MFA policy, token validity.",
            "cognito-idp",
        ),
        "eventbridge-saas-partners": (
            "EventBridge event buses with partner event sources — third-party SaaS vendors pushing events into AWS.",
            "events",
        ),
        "aws-sso-saml-federation": (
            "SAML identity provider registrations in IAM (non-IAM Identity Center SAML) — enterprise IdP via legacy SAML 2.0 federation.",
            "iam",
        ),
    },
    "ai-spm": {
        "bedrock-access-security": (
            "Amazon Bedrock model access configuration — enabled models, provisioned throughput endpoint access, custom model storage security.",
            "bedrock",
        ),
        "sagemaker-endpoint-security": (
            "SageMaker real-time inference endpoint exposure — VPC isolation, container privilege mode, IAM access, data capture configuration.",
            "sagemaker",
        ),
        "sagemaker-training-data-security": (
            "SageMaker training job security — S3 training data access scope, VPC isolation, inter-container encryption, output artifact encryption.",
            "sagemaker",
        ),
        "bedrock-guardrails-audit": (
            "Amazon Bedrock Guardrails configuration — PII masking policies, content filters, topic denial, grounding checks.",
            "bedrock",
        ),
        "bedrock-model-invocation-logging": (
            "Amazon Bedrock model invocation logging — verifies prompts and completions are logged for audit and threat detection.",
            "bedrock",
        ),
        "q-business-data-security": (
            "Amazon Q Business application security — data source connector access, retriever configuration, index encryption, attribute-based ACLs.",
            "qbusiness",
        ),
    },
}

# ── Aliases (per Canonical Reference Map in registry/p01_header.md) ─────────
#
# (category, slug) → canonical_name
ALIASES: dict[tuple[str, str], dict] = {
    ("kspm", "eks-irsa-security"): {
        "alias_of": "aws:nhi/irsa-binding-audit",
        "description": "EKS IRSA binding audit (alias of nhi/irsa-binding-audit).",
        "service": "eks",
    },
    ("api", "waf-assessment"): {
        "alias_of": "aws:network/waf-assessment",
        "description": "AWS WAF v2 WebACL configuration (alias of network/waf-assessment).",
        "service": "wafv2",
    },
    ("secrets", "ssm-parameter-security"): {
        "alias_of": "aws:devsecops/ssm-parameter-security",
        "description": "SSM Parameter Store secrets governance (alias of devsecops/ssm-parameter-security).",
        "service": "ssm",
    },
}

# ── Stub templates ──────────────────────────────────────────────────────────

_CANONICAL_STUB = """\
---
name: aws:{category}/{slug}
version: 2025-01
provider: aws
category: {category}{service_line}
context: inline
description: '{description}'
whenToUse: 'TODO: fill in from registry/p*.md whenToUse / Scope paragraph'
requires:
  - aws-cli
  - 'configured AWS credentials'
canonical: true
status: active
---

# {title} (v3 STUB)

<!-- This is a v3 scaffold stub. Fill in PART A (registry manifest) and
     PART B (10-block operational runbook) from:
       cloudguard-runtime/skills/_templates/SKILL_TEMPLATE.md

     Source spec: registry/p*.md → `aws/{category}/{slug}` section.

     `validate_skills.py --strict` will fail until TODOs are removed. -->

## Scope

TODO: One-paragraph scope statement from registry/p*.md.

## Does NOT cover

- TODO (→ `aws/[category]/[slug]`)

## IAM Actions (READ)

```json
[
  "TODO:Action"
]
```

## IAM Actions (WRITE)

TODO

**READ:** TODO | **WRITE:** TODO

## Findings (Summary)

- `[CRITICAL]` TODO
- `[HIGH]` TODO
- `[MEDIUM]` TODO
- `[LOW]` TODO

## Changelog

- **2025-01:** Initial v3 stub created by scaffold_v3_aws_structure.py.
"""

_ALIAS_STUB = """\
---
name: aws:{category}/{slug}
version: 2025-01
provider: aws
category: {category}{service_line}
context: inline
description: '{description}'
whenToUse: 'Alias of {alias_of} — see canonical home.'
requires:
  - aws-cli
canonical: false
alias_of: {alias_of}
status: active
---

# {title} (alias)

This skill is an alias of `{alias_of}`. The canonical home is at the target
path. All agent routing resolves to the canonical path.

→ See `{canonical_relpath}` for the full spec.
"""


def _title(slug: str) -> str:
    """Convert slug to Title Case for skill headings."""
    return " ".join(p.capitalize() for p in slug.replace("_", "-").split("-"))


def _service_line(service: str | None) -> str:
    return f"\nservice: {service}" if service else ""


def _alias_canonical_relpath(canonical_name: str) -> str:
    """Convert `aws:nhi/irsa-binding-audit` → `aws/nhi/irsa-binding-audit/SKILL.md`."""
    _, rest = canonical_name.split(":", 1)
    return f"aws/{rest}/SKILL.md"


def render_canonical(category: str, slug: str, description: str,
                     service: str | None) -> str:
    return _CANONICAL_STUB.format(
        category=category,
        slug=slug,
        title=_title(slug),
        description=description,
        service_line=_service_line(service),
    )


def render_alias(category: str, slug: str, alias_meta: dict) -> str:
    return _ALIAS_STUB.format(
        category=category,
        slug=slug,
        title=_title(slug),
        description=alias_meta["description"],
        service_line=_service_line(alias_meta.get("service")),
        alias_of=alias_meta["alias_of"],
        canonical_relpath=_alias_canonical_relpath(alias_meta["alias_of"]),
    )


# ── Main ────────────────────────────────────────────────────────────────────

def scaffold(root: Path, write: bool, force: bool) -> dict:
    aws_dir = root / "aws"
    by_category: dict[str, list[str]] = {}
    created: list[str] = []
    skipped_exists: list[str] = []

    # Canonical skills
    for category, skills in V3_AWS_SKILLS.items():
        for slug, (description, service) in skills.items():
            skill_dir = aws_dir / category / slug
            skill_file = skill_dir / "SKILL.md"
            by_category.setdefault(category, []).append(slug)

            if skill_file.exists() and not force:
                skipped_exists.append(f"aws/{category}/{slug}")
                continue

            content = render_canonical(category, slug, description, service)
            if write:
                skill_dir.mkdir(parents=True, exist_ok=True)
                skill_file.write_text(content, encoding="utf-8")
            created.append(f"aws/{category}/{slug}")

    # Aliases
    alias_created: list[str] = []
    alias_skipped: list[str] = []
    for (category, slug), meta in ALIASES.items():
        skill_dir = aws_dir / category / slug
        skill_file = skill_dir / "SKILL.md"
        by_category.setdefault(category, []).append(f"{slug} [alias]")

        if skill_file.exists() and not force:
            alias_skipped.append(f"aws/{category}/{slug} → {meta['alias_of']}")
            continue

        content = render_alias(category, slug, meta)
        if write:
            skill_dir.mkdir(parents=True, exist_ok=True)
            skill_file.write_text(content, encoding="utf-8")
        alias_created.append(f"aws/{category}/{slug} → {meta['alias_of']}")

    return {
        "by_category": by_category,
        "created": created,
        "skipped_exists": skipped_exists,
        "alias_created": alias_created,
        "alias_skipped": alias_skipped,
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--root", type=Path,
                        default=Path("cloudguard-runtime/skills"),
                        help="Skills tree root")
    parser.add_argument("--write", action="store_true",
                        help="Execute (default is dry-run)")
    parser.add_argument("--force", action="store_true",
                        help="Overwrite existing SKILL.md files (DESTRUCTIVE)")
    args = parser.parse_args(argv)

    if args.write and not args.root.parent.exists():
        parser.error(f"--root parent does not exist: {args.root.parent}")

    result = scaffold(args.root, args.write, args.force)
    mode = "WROTE" if args.write else "DRY-RUN"

    print("=" * 60)
    print(f"{mode}: v3 AWS scaffold at {args.root}/aws/")
    print("=" * 60)
    total = sum(len(v) for v in result["by_category"].values())
    print(f"Total skills declared: {total}")
    for category in sorted(result["by_category"]):
        slugs = result["by_category"][category]
        print(f"  {category:14s} ({len(slugs):2d}): {', '.join(sorted(slugs))}")
    print()
    print(f"Created : {len(result['created'])}")
    print(f"Aliases : {len(result['alias_created'])}")
    print(f"Skipped : {len(result['skipped_exists']) + len(result['alias_skipped'])} (already existed)")
    if result["alias_created"]:
        print()
        print("Aliases:")
        for a in result["alias_created"]:
            # Replace non-ASCII arrow for Windows cp1252 consoles
            print(f"  {a.replace(chr(0x2192), '->')}")
    print("=" * 60)
    return 0


if __name__ == "__main__":
    # Reconfigure stdout to UTF-8 if available (Python 3.7+) — falls back
    # silently on platforms where reconfigure() is not supported.
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, Exception):
        pass
    sys.exit(main())

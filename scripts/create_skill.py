#!/usr/bin/env python3
"""
Scaffold a new CloudGuard skill with consistent structured frontmatter.

Avoids the copy-paste-edit mistakes that pile up at scale (98+ AWS skills).
Produces:
    cloudguard-runtime/skills/{provider}/{slug}/SKILL.md

Usage:
    python scripts/create_skill.py aws s3-public-acl \\
        --description "S3 bucket ACL public-read/public-write detection" \\
        --when-to-use "When auditing S3 bucket ACLs for public principals" \\
        --category data \\
        --service s3 \\
        --layer 5 \\
        --requires aws-cli

Defaults (when flags omitted):
    --category      → "system" (you'll get a validate warning until you fix it)
    --context       → "inline"
    --layer         → omitted
    --service       → inferred from slug prefix (s3-*, ec2-*, iam-*) when possible
    --description   → "TODO: one-line description (≤200 chars)"
    --when-to-use   → "TODO: describe the trigger conditions for this skill"

The body template includes the standard CloudGuard skill structure:
PRIORITY BLOCK, SCOPE FENCE, the detection commands section, and an
EVIDENCE FIREWALL placeholder. Author fills in the actual content.

Safe by default: refuses to overwrite an existing SKILL.md unless --force.
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_REPO_ROOT))

from openhands.services.skills.registry import (  # noqa: E402
    VALID_CATEGORIES,
    VALID_PROVIDERS,
)

# ── Service inference ──────────────────────────────────────────────────────
# Common AWS service prefixes for slug-based service auto-detection.
# Extend this map as new AWS service skills are added.
_AWS_SERVICE_PREFIXES: list[tuple[str, str]] = [
    # (slug-prefix, service)
    ("s3-",          "s3"),
    ("ec2-",         "ec2"),
    ("iam-",         "iam"),
    ("rds-",         "rds"),
    ("lambda-",      "lambda"),
    ("kms-",         "kms"),
    ("ecr-",         "ecr"),
    ("ecs-",         "ecs"),
    ("eks-",         "eks"),
    ("vpc-",         "vpc"),
    ("elb-",         "elb"),
    ("alb-",         "elb"),
    ("nlb-",         "elb"),
    ("apigw-",       "apigateway"),
    ("apigateway-",  "apigateway"),
    ("cloudfront-",  "cloudfront"),
    ("cloudtrail-",  "cloudtrail"),
    ("cloudwatch-",  "cloudwatch"),
    ("config-",      "config"),
    ("guardduty-",   "guardduty"),
    ("securityhub-", "securityhub"),
    ("inspector-",   "inspector"),
    ("macie-",       "macie"),
    ("ssm-",         "ssm"),
    ("secrets-",     "secretsmanager"),
    ("sns-",         "sns"),
    ("sqs-",         "sqs"),
    ("dynamodb-",    "dynamodb"),
    ("waf-",         "waf"),
    ("shield-",      "shield"),
    ("route53-",     "route53"),
    ("acm-",         "acm"),
    ("cognito-",     "cognito"),
    ("organizations-", "organizations"),
    ("sso-",         "sso"),
    ("backup-",      "backup"),
    ("efs-",         "efs"),
    ("fsx-",         "fsx"),
    ("redshift-",    "redshift"),
]


def infer_service(provider: str, slug: str) -> str | None:
    """Auto-detect a service from the slug prefix.

    Only AWS slug patterns are supported right now; other providers return None.
    """
    if provider != "aws":
        return None
    for prefix, service in _AWS_SERVICE_PREFIXES:
        if slug.startswith(prefix):
            return service
    return None


# ── Body template ──────────────────────────────────────────────────────────

_BODY_TEMPLATE = """\
# ── PRIORITY BLOCK (≤20 lines — always injected for dynamic skills) ─────────

Domain: TODO — one-line domain framing (what this skill audits and why it matters).
MUST: TODO — the highest-priority finding rule (CRITICAL severity).
MUST: TODO — secondary CRITICAL/HIGH detection rule.
MUST: TODO — third detection rule.
OUT OF SCOPE: TODO — what this skill explicitly does NOT do.
SEVERITY ANCHOR: TODO — the rule that fixes severity calibration for this domain.
EVIDENCE FIREWALL: Cannot cite TODO_TOOL_OUTPUT → cannot raise TODO_FINDING → output NO DATA.
INJECTION GUARD: TODO — list field types that are Level 3 (never instructions).

# ══════════════════════════════════════════════════════════════
# BLOCK 1 — SCOPE FENCE
# ══════════════════════════════════════════════════════════════

TODO — describe what this skill enumerates first (no security checks yet).
What does the scope look like? Which resources, which regions, which accounts?

# ══════════════════════════════════════════════════════════════
# BLOCK 2 — DETECTION COMMANDS
# ══════════════════════════════════════════════════════════════

TODO — list the specific cloud CLI commands run for this skill.

```bash
# Example placeholder — replace with the real assessment commands
aws TODO_SERVICE TODO_OPERATION \\
  --region {{REGION}} \\
  --output json
```

# ══════════════════════════════════════════════════════════════
# BLOCK 3 — FINDING RULES
# ══════════════════════════════════════════════════════════════

TODO — describe the exact conditions that produce findings, severity for
each, and the kg_store_finding payload structure.

# ══════════════════════════════════════════════════════════════
# BLOCK 4 — REPORT FORMAT
# ══════════════════════════════════════════════════════════════

TODO — the structure of the findings report this skill produces.
"""


# ── Frontmatter generation ─────────────────────────────────────────────────

def build_frontmatter(
    name: str,
    slug: str,
    provider: str,
    description: str,
    when_to_use: str,
    category: str,
    context: str,
    layer: int | None,
    service: str | None,
    requires: list[str],
    triggers: list[str],
) -> str:
    safe_desc = description.replace('"', "'")
    safe_when = when_to_use.replace('"', "'")
    lines = [
        "---",
        f'name: {name}',
        f'description: "{safe_desc}"',
        f'whenToUse: "{safe_when}"',
        f'provider: {provider}',
        f'category: {category}',
        f'context: {context}',
    ]
    if service:
        lines.append(f'service: {service}')
    if layer is not None:
        lines.append(f'layer: {layer}')
    if requires:
        lines.append('requires:')
        for r in requires:
            lines.append(f'  - {r}')
    if triggers:
        lines.append('triggers:')
        for t in triggers:
            lines.append(f'  - {t}')
    lines.append("---")
    return "\n".join(lines) + "\n"


# ── Main ────────────────────────────────────────────────────────────────────

def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Scaffold a new CloudGuard skill",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("provider", choices=sorted(VALID_PROVIDERS),
                        help="Provider namespace (aws, azure, gcp, shared, internal)")
    parser.add_argument("slug",
                        help="Skill slug (kebab-case, e.g. 's3-public-acl')")
    parser.add_argument("--target-root", type=Path,
                        default=Path("cloudguard-runtime/skills"),
                        help="Skills tree root (default: cloudguard-runtime/skills)")
    parser.add_argument("--description",
                        default="TODO: one-line description (≤200 chars)")
    parser.add_argument("--when-to-use",
                        default="TODO: describe the trigger conditions for this skill")
    parser.add_argument("--category", choices=sorted(VALID_CATEGORIES),
                        default="system",
                        help="Category (default: system — change before commit)")
    parser.add_argument("--context", choices=("inline", "fork"), default="inline")
    parser.add_argument("--layer", type=int,
                        help="CloudGuard assessment layer 1-9 (optional)")
    parser.add_argument("--service",
                        help="Service sub-namespace (e.g. 'ec2', 's3'). Auto-inferred from slug for AWS.")
    parser.add_argument("--requires", nargs="*", default=[],
                        help="Runtime dependencies (e.g. aws-cli)")
    parser.add_argument("--triggers", nargs="*", default=[],
                        help="Trigger keywords (informational, not used by registry)")
    parser.add_argument("--force", action="store_true",
                        help="Overwrite an existing SKILL.md")
    args = parser.parse_args(argv)

    # Validate slug format (kebab-case, alphanumeric + dashes)
    if not args.slug.replace("-", "").replace("_", "").isalnum():
        parser.error(f"slug must be kebab-case alphanumeric: {args.slug!r}")
    if args.slug.startswith("-") or args.slug.endswith("-"):
        parser.error(f"slug must not start or end with dash: {args.slug!r}")

    name = f"{args.provider}:{args.slug}"
    service = args.service or infer_service(args.provider, args.slug)

    target_dir = args.target_root / args.provider / args.slug
    target_file = target_dir / "SKILL.md"

    if target_file.exists() and not args.force:
        print(f"refusing to overwrite existing skill: {target_file}", file=sys.stderr)
        print("  use --force to overwrite", file=sys.stderr)
        return 1

    frontmatter = build_frontmatter(
        name=name, slug=args.slug, provider=args.provider,
        description=args.description, when_to_use=args.when_to_use,
        category=args.category, context=args.context, layer=args.layer,
        service=service, requires=args.requires, triggers=args.triggers,
    )
    content = frontmatter + _BODY_TEMPLATE

    target_dir.mkdir(parents=True, exist_ok=True)
    target_file.write_text(content, encoding="utf-8")
    print(f"created {target_file}")
    print(f"  name:     {name}")
    print(f"  provider: {args.provider}")
    print(f"  category: {args.category}")
    if service:
        print(f"  service:  {service}")
    if args.layer is not None:
        print(f"  layer:    {args.layer}")
    print()
    print("Next steps:")
    print(f"  1. edit {target_file}")
    print(f"  2. fill in the PRIORITY BLOCK + DETECTION COMMANDS")
    print(f"  3. run: python scripts/validate_skills.py")
    print(f"  4. commit when validate is clean")
    return 0


if __name__ == "__main__":
    sys.exit(main())

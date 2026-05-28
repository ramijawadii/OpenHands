#!/usr/bin/env python3
"""
Validate every SKILL.md in the skills tree.

Designed for CI: returns exit code 0 when every skill passes, 1 when any
fails. Designed for scale (98+ skills): walks the tree once, reports all
problems before exiting so authors can fix in one pass.

Checks:
    [PRESENT]   Required frontmatter fields are present (name, description,
                whenToUse, provider, category, context)
    [VALID]     Provider, category, context have allowed values
    [MATCH]     ``name:`` matches the file's directory path (``{provider}/{slug}``)
    [DUP]       No duplicate ``name:`` values across the tree
    [BODY]      File has non-trivial body content (not just frontmatter)
    [NO_TODO]   Description and whenToUse don't contain literal "TODO:"
                (catches forgotten scaffolds before they ship)

Usage:
    # Default: scan cloudguard-runtime/skills/
    python scripts/validate_skills.py

    # Specific tree
    python scripts/validate_skills.py --root /workspace/cloudguard-runtime/skills

    # Strict mode: TODO scaffolds fail (recommended for CI)
    python scripts/validate_skills.py --strict

    # JSON output for tooling
    python scripts/validate_skills.py --json
"""
from __future__ import annotations

import argparse
import json
import sys
from collections import defaultdict
from dataclasses import dataclass, field
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_REPO_ROOT))

from openhands.services.skills.registry import (  # noqa: E402
    VALID_CATEGORIES,
    VALID_PROVIDERS,
    _parse_frontmatter,
)


# ── Issue tracking ─────────────────────────────────────────────────────────

@dataclass
class FileReport:
    path: str
    name: str = ""
    issues: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)

    @property
    def ok(self) -> bool:
        return not self.issues


# ── Validators ─────────────────────────────────────────────────────────────

_REQUIRED_FIELDS = ("name", "description", "whenToUse", "provider", "category", "context")


def validate_one(skill_file: Path, root: Path, strict: bool) -> FileReport:
    """Check a single SKILL.md file. Returns a FileReport with issues."""
    rel = str(skill_file.relative_to(root))
    report = FileReport(path=rel)

    try:
        raw = skill_file.read_text(encoding="utf-8")
    except OSError as e:
        report.issues.append(f"unreadable: {e}")
        return report

    meta, body = _parse_frontmatter(raw)

    # Required fields
    for f in _REQUIRED_FIELDS:
        if not meta.get(f):
            report.issues.append(f"missing required field: {f}")

    report.name = meta.get("name", "")

    # Enum validation
    provider = meta.get("provider")
    if provider and provider not in VALID_PROVIDERS:
        report.issues.append(
            f"invalid provider {provider!r}; allowed: {sorted(VALID_PROVIDERS)}"
        )

    category = meta.get("category")
    if category and category not in VALID_CATEGORIES:
        report.issues.append(
            f"invalid category {category!r}; allowed: {sorted(VALID_CATEGORIES)}"
        )

    context = meta.get("context")
    if context and context not in ("inline", "fork"):
        report.issues.append(
            f"invalid context {context!r}; must be 'inline' or 'fork'"
        )

    # Layer numeric check (optional field)
    layer = meta.get("layer")
    if layer:
        try:
            int(layer)
        except (ValueError, TypeError):
            report.issues.append(f"layer must be an integer; got {layer!r}")

    # Path consistency. Two layouts allowed:
    #   2-level: {provider}/{slug}/SKILL.md          → name = provider:slug
    #   3-level: {provider}/{category}/{slug}/SKILL.md → name = provider:category/slug
    parts = skill_file.relative_to(root).parts
    if len(parts) == 4 and parts[3] == "SKILL.md":
        dir_provider, dir_category, dir_slug, _ = parts
        expected_name = f"{dir_provider}:{dir_category}/{dir_slug}"
        if report.name and report.name != expected_name:
            report.issues.append(
                f"name {report.name!r} doesn't match 3-level directory: "
                f"expected {expected_name!r}"
            )
        if provider and provider != dir_provider:
            report.issues.append(
                f"provider {provider!r} doesn't match directory: expected {dir_provider!r}"
            )
        if category and category != dir_category:
            report.issues.append(
                f"category {category!r} doesn't match directory: expected {dir_category!r}"
            )
    elif len(parts) == 3 and parts[2] == "SKILL.md":
        dir_provider, dir_slug, _ = parts
        expected_name = f"{dir_provider}:{dir_slug}"
        if report.name and report.name != expected_name:
            report.issues.append(
                f"name {report.name!r} doesn't match 2-level directory: "
                f"expected {expected_name!r}"
            )
        if provider and provider != dir_provider:
            report.issues.append(
                f"provider {provider!r} doesn't match directory: expected {dir_provider!r}"
            )
    else:
        report.issues.append(
            f"unexpected path: should be "
            f"{root}/{{provider}}/{{slug}}/SKILL.md or "
            f"{root}/{{provider}}/{{category}}/{{slug}}/SKILL.md"
        )

    # Body must have substantive content
    if len(body.strip()) < 100:
        report.issues.append(
            f"body too small ({len(body.strip())} chars); skills should have real content"
        )

    # TODO scaffold detection — strict fails, non-strict only warns.
    desc = (meta.get("description") or "").strip()
    when = (meta.get("whenToUse") or "").strip()
    if "TODO:" in desc or "TODO:" in when or "TODO —" in body or "v3 STUB" in body:
        msg = "contains TODO placeholders (forgotten scaffold?)"
        if strict:
            report.issues.append(msg)
        else:
            report.warnings.append(msg)

    return report


def find_duplicates(reports: list[FileReport]) -> dict[str, list[str]]:
    """Return a mapping of duplicate name → list of file paths."""
    by_name: dict[str, list[str]] = defaultdict(list)
    for r in reports:
        if r.name:
            by_name[r.name].append(r.path)
    return {name: paths for name, paths in by_name.items() if len(paths) > 1}


# ── Main ────────────────────────────────────────────────────────────────────

def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--root", type=Path,
                        default=Path("cloudguard-runtime/skills"),
                        help="Skills tree root (default: cloudguard-runtime/skills)")
    parser.add_argument("--strict", action="store_true",
                        help="Treat TODO scaffolds as errors (recommended for CI)")
    parser.add_argument("--json", action="store_true",
                        help="Emit machine-readable JSON instead of text")
    parser.add_argument("--quiet", "-q", action="store_true",
                        help="Only print failures and the summary")
    args = parser.parse_args(argv)

    if not args.root.is_dir():
        print(f"error: skills root not found: {args.root}", file=sys.stderr)
        return 2

    # Walk the tree — both 2-level and 3-level layouts.
    skill_files = sorted(set(
        list(args.root.glob("*/*/SKILL.md"))           # provider/slug/SKILL.md
        + list(args.root.glob("*/*/*/SKILL.md"))       # provider/category/slug/SKILL.md
    ))
    if not skill_files:
        print(f"warning: no SKILL.md files found under {args.root}",
              file=sys.stderr)
        return 1 if args.strict else 0

    reports = [validate_one(f, args.root, args.strict) for f in skill_files]
    dupes = find_duplicates(reports)

    # Apply duplicate issues
    for name, paths in dupes.items():
        for p in paths:
            r = next(r for r in reports if r.path == p)
            r.issues.append(
                f"duplicate name {name!r} (also in: {', '.join(o for o in paths if o != p)})"
            )

    # ── Output ───────────────────────────────────────────────────────────
    if args.json:
        result = {
            "root": str(args.root),
            "total": len(reports),
            "passed": sum(1 for r in reports if r.ok),
            "failed": sum(1 for r in reports if not r.ok),
            "duplicates": dupes,
            "files": [
                {"path": r.path, "name": r.name, "ok": r.ok, "issues": r.issues}
                for r in reports
            ],
        }
        print(json.dumps(result, indent=2))
        return 0 if all(r.ok for r in reports) else 1

    # Text output
    for r in reports:
        if r.ok and not r.warnings and not args.quiet:
            print(f"  [ok]   {r.path}")
        elif r.ok and r.warnings and not args.quiet:
            print(f"  [warn] {r.path}")
            for w in r.warnings:
                print(f"           ~ {w}")
        elif not r.ok:
            print(f"  [FAIL] {r.path}")
            for issue in r.issues:
                print(f"           - {issue}")

    passed = sum(1 for r in reports if r.ok)
    failed = sum(1 for r in reports if not r.ok)
    warned = sum(1 for r in reports if r.ok and r.warnings)
    print()
    print("=" * 60)
    print(f"Validated: {len(reports)} skills")
    print(f"  Passed:  {passed}")
    if warned:
        print(f"  Warned:  {warned} (TODO scaffolds — pass non-strict, fail strict)")
    print(f"  Failed:  {failed}")
    if dupes:
        print(f"  Duplicate names: {len(dupes)}")
    print("=" * 60)
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())

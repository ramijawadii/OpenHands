#!/usr/bin/env python3
"""
Migrate CloudGuard flat skill files to the provider-namespaced layout.

Input  : ``--source <dir>`` — flat directory of ``cloudguard-{slug}.md``
                              or ``{slug}.md`` legacy files.
Output : ``--target <dir>`` — provider-namespaced tree:
         ``{target}/{provider}/{slug}/SKILL.md`` with structured frontmatter.

The script is idempotent: re-running overwrites existing target files with
fresh frontmatter while preserving the body text byte-for-byte.

By default a ``--dry-run`` mode prints the planned moves without writing.
Pass ``--write`` to perform the migration.

Usage:
    # Dry run (default) — print planned operations
    python scripts/migrate_skills.py \\
        --source /workspace/.openhands/microagents \\
        --target /workspace/cloudguard-runtime/skills

    # Real migration
    python scripts/migrate_skills.py \\
        --source /workspace/.openhands/microagents \\
        --target /workspace/cloudguard-runtime/skills \\
        --write

The frontmatter generator infers ``provider``, ``category``, ``description``,
and ``whenToUse`` from:
- The slug (provider/category inference table in the registry)
- The existing ``triggers:`` list (rendered as the ``whenToUse`` line)
- The first ``## `` heading in the body (used as ``description`` when absent)

Skipped (not migrated): repo.md, tools.md, workflow.md, work_hosts.md,
domain-aggregator files (containers.md, data.md, etc.).
"""
from __future__ import annotations

import argparse
import logging
import re
import sys
from pathlib import Path

# Make the registry importable when this script runs from the repo root.
_REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_REPO_ROOT))

from openhands.services.skills.registry import (  # noqa: E402
    _LEGACY_FILENAME_RES,
    _LEGACY_IGNORE_FILENAMES,
    _infer_provider_category,
    _legacy_description,
    _parse_frontmatter,
)

logger = logging.getLogger("migrate_skills")


# ── Frontmatter generation ──────────────────────────────────────────────────

def build_new_frontmatter(
    slug: str, provider: str, category: str,
    description: str, triggers: list[str],
) -> str:
    """Produce the structured YAML frontmatter for the new SKILL.md."""
    when_to_use = (
        f"Triggers: {', '.join(triggers[:5])}" if triggers else
        f"When assessing {slug.replace('-', ' ')} security."
    )

    # Escape colons in description (YAML-sensitive)
    safe_desc = description.replace('"', "'")
    safe_when = when_to_use.replace('"', "'")

    lines = [
        "---",
        f'name: {provider}:{slug}',
        f'description: "{safe_desc}"',
        f'whenToUse: "{safe_when}"',
        f'provider: {provider}',
        f'category: {category}',
        'context: inline',
    ]
    if triggers:
        lines.append('triggers:')
        for t in triggers[:10]:  # cap to avoid bloat
            lines.append(f'  - {t}')
    lines.append("---")
    return "\n".join(lines) + "\n"


# ── Migration ────────────────────────────────────────────────────────────────

def migrate_one(
    source_file: Path,
    target_root: Path,
    dry_run: bool,
) -> tuple[str, str] | None:
    """Migrate one legacy file.

    Returns ``(slug, target_path)`` on success, ``None`` if skipped.
    """
    if source_file.name in _LEGACY_IGNORE_FILENAMES:
        return None

    slug: str | None = None
    for rx in _LEGACY_FILENAME_RES:
        m = rx.match(source_file.name)
        if m:
            slug = m.group(1)
            break
    if slug is None:
        return None

    raw = source_file.read_text(encoding="utf-8")
    meta, body = _parse_frontmatter(raw)

    provider, category = _infer_provider_category(slug)
    triggers = meta.get("triggers") or []
    description = meta.get("description") or _legacy_description(slug, raw)

    target_dir = target_root / provider / slug
    target_file = target_dir / "SKILL.md"

    new_frontmatter = build_new_frontmatter(
        slug, provider, category, description, triggers,
    )
    new_content = new_frontmatter + body.lstrip("\n")

    if dry_run:
        logger.info("DRY-RUN %s → %s", source_file.name, target_file)
    else:
        target_dir.mkdir(parents=True, exist_ok=True)
        target_file.write_text(new_content, encoding="utf-8")
        logger.info("wrote %s", target_file)

    return slug, str(target_file)


def migrate_dir(source: Path, target: Path, dry_run: bool) -> dict:
    """Walk source directory and migrate every legacy file."""
    if not source.is_dir():
        raise SystemExit(f"source not found or not a directory: {source}")

    if not dry_run:
        target.mkdir(parents=True, exist_ok=True)

    by_provider: dict[str, list[str]] = {}
    skipped: list[str] = []

    for source_file in sorted(source.glob("*.md")):
        result = migrate_one(source_file, target, dry_run)
        if result is None:
            skipped.append(source_file.name)
            continue
        slug, _ = result
        # Re-infer provider for the summary
        provider, _cat = _infer_provider_category(slug)
        by_provider.setdefault(provider, []).append(slug)

    return {"migrated_by_provider": by_provider, "skipped": skipped}


# ── CLI ─────────────────────────────────────────────────────────────────────

def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--source", required=True, type=Path,
                        help="legacy flat skill directory")
    parser.add_argument("--target", required=True, type=Path,
                        help="target provider-namespaced directory")
    parser.add_argument("--write", action="store_true",
                        help="perform the migration (default is dry-run)")
    parser.add_argument("--verbose", "-v", action="store_true")
    args = parser.parse_args(argv)

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(message)s",
    )

    result = migrate_dir(args.source, args.target, dry_run=not args.write)

    print()
    print("=" * 60)
    mode = "DRY-RUN" if not args.write else "MIGRATED"
    total = sum(len(v) for v in result["migrated_by_provider"].values())
    print(f"{mode}: {total} skills")
    for provider in sorted(result["migrated_by_provider"]):
        slugs = result["migrated_by_provider"][provider]
        print(f"  {provider}: {len(slugs)} skills — {', '.join(sorted(slugs))}")
    if result["skipped"]:
        print(f"\nSkipped ({len(result['skipped'])}): "
              + ", ".join(sorted(result['skipped'])))
    print("=" * 60)
    return 0


if __name__ == "__main__":
    sys.exit(main())

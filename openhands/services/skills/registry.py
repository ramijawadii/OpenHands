"""
CloudGuard SkillRegistry — provider-namespaced security microagent registry.

Architecture mirrors Claude Code's SkillTool (src/tools/SkillTool/) adapted for
CloudGuard's cloud-security domain:

- Provider namespacing: ``aws:iam``, ``azure:iam``, ``gcp:iam``, ``shared:network``
- Structured YAML frontmatter (name, description, when_to_use, provider, category)
- Budget-aware listing (Claude Code's 1% context window cap)
- Delta tracking (only NEW skills announced each turn via ``format_delta``)
- Lazy content loading (full skill body read only on invocation)
- Backward compatibility: still loads legacy ``cloudguard-{slug}.md`` flat files

Thread-safe: all mutations acquire ``_lock``. Designed for concurrent access
from the event-loop thread (session._on_event) and executor thread (agent.step).
"""
from __future__ import annotations

import logging
import os
import re
import threading
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterable, Optional

logger = logging.getLogger(__name__)

# ── Constants ───────────────────────────────────────────────────────────────

#: Truncation for skill description+whenToUse in the listing.
MAX_LISTING_DESC_CHARS = 250

#: Fraction of the context window allocated to the skill listing.
#: Mirrors Claude Code's SKILL_BUDGET_CONTEXT_PERCENT.
SKILL_BUDGET_CONTEXT_PERCENT = 0.01

#: Approximation used for char→token budget conversion.
CHARS_PER_TOKEN = 4

#: Provider sort priority: lower = earlier in listing.
PROVIDER_PRIORITY: dict[str, int] = {
    "internal": -2,  # core, assess, environment-map — load first
    "shared": -1,    # cross-cloud (kubernetes, docker, network)
    "aws": 0,
    "azure": 1,
    "gcp": 2,
}

#: Valid provider values for the ``provider:`` frontmatter field.
VALID_PROVIDERS = frozenset({"aws", "azure", "gcp", "shared", "internal"})

#: Valid category values for the ``category:`` frontmatter field.
VALID_CATEGORIES = frozenset({
    "identity", "posture", "network", "workload", "data",
    "hardening", "detection", "chain", "orchestration",
    "reporting", "system",
})

#: YAML frontmatter delimiter pattern.
_FRONTMATTER_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n(.*)$", re.DOTALL)

#: Legacy flat-file naming patterns:
#: - ``cloudguard-iam-aws.md`` (source repo)
#: - ``iam-aws.md`` (deployed runtime location)
_LEGACY_FILENAME_RES = (
    re.compile(r"^cloudguard-(.+)\.md$"),
    re.compile(r"^([a-z][a-z0-9_-]+)\.md$"),
)

#: Files to ignore in legacy directories — READMEs, metadata, and domain
#: aggregator/index files (containers.md, data.md, etc. are NOT skills;
#: they're trigger-keyword indexes for the legacy auto-recall system).
_LEGACY_IGNORE_FILENAMES = frozenset({
    # Repo metadata
    "README.md", "add_agent.md", "add_repo_inst.md",
    "repo.md", "tools.md", "workflow.md", "work_hosts.md",
    "skills.md", "subagents.md", "report-style.md",
    # Internal kernel/notebook helpers (loaded via different path)
    "python-execution.md",
    # Domain aggregator/index files (not skills — keyword indexes)
    "containers.md", "data.md", "detection.md", "dlp.md",
    "exposure.md", "hardening.md", "identity.md", "network.md",
    "privileged.md", "supply_chain.md", "vulnerability.md", "waf.md",
})


# ── Data classes ────────────────────────────────────────────────────────────

@dataclass(frozen=False)
class SkillEntry:
    """One skill in the registry.

    Frozen=False because ``_content`` is lazily populated. All other fields
    are set at load time and never mutated.
    """

    # Identity
    name: str                # "aws:iam"
    short_name: str          # "iam"
    provider: str            # "aws" | "azure" | "gcp" | "shared" | "internal"

    # Listing metadata
    description: str
    when_to_use: str

    # Classification
    category: str
    layer: Optional[int]
    requires: list[str]
    context: str             # "inline" | "fork"

    # Source
    source_path: str

    # Lazy-loaded content (full Markdown body, no frontmatter)
    _content: Optional[str] = field(default=None, repr=False, compare=False)

    def __post_init__(self) -> None:
        if self.provider not in VALID_PROVIDERS:
            raise ValueError(
                f"Invalid provider {self.provider!r} for skill {self.name!r}; "
                f"must be one of {sorted(VALID_PROVIDERS)}"
            )
        if self.category not in VALID_CATEGORIES:
            raise ValueError(
                f"Invalid category {self.category!r} for skill {self.name!r}; "
                f"must be one of {sorted(VALID_CATEGORIES)}"
            )
        if self.context not in ("inline", "fork"):
            raise ValueError(
                f"Invalid context {self.context!r} for skill {self.name!r}; "
                f"must be 'inline' or 'fork'"
            )


# ── Frontmatter parsing ─────────────────────────────────────────────────────

def _parse_frontmatter(raw: str) -> tuple[dict, str]:
    """Parse YAML frontmatter from a Markdown file.

    Returns ``(metadata_dict, body)``. Uses a minimal YAML subset (just the
    keys we care about) to avoid adding a PyYAML dependency to a hot path.

    Supported syntax (per-line):
        key: value
        key:
          - item1
          - item2
    """
    match = _FRONTMATTER_RE.match(raw)
    if not match:
        return {}, raw

    front, body = match.group(1), match.group(2)
    meta: dict = {}
    current_list_key: Optional[str] = None

    for line in front.splitlines():
        stripped = line.rstrip()
        if not stripped or stripped.startswith("#"):
            continue

        # List continuation
        if stripped.lstrip().startswith("-") and current_list_key:
            item = stripped.lstrip()[1:].strip()
            if item:
                meta[current_list_key].append(item)
            continue

        # New key
        if ":" in stripped:
            key, _, val = stripped.partition(":")
            key = key.strip()
            val = val.strip()
            if not val:
                # Start of a list/block
                meta[key] = []
                current_list_key = key
            else:
                # Strip surrounding quotes
                if (val.startswith('"') and val.endswith('"')) or (
                    val.startswith("'") and val.endswith("'")
                ):
                    val = val[1:-1]
                meta[key] = val
                current_list_key = None

    return meta, body


# ── Registry ────────────────────────────────────────────────────────────────

class SkillRegistry:
    """Multi-provider skill registry with budget-aware listing and delta tracking.

    Loading strategy:
        1. New layout: walk ``{base_dir}/{provider}/{slug}/SKILL.md``
        2. Legacy layout: walk ``{legacy_dir}/cloudguard-{slug}.md`` and infer
           provider/category from the slug (backward compat for unmigrated files)

    The registry de-duplicates by ``name``: new-layout entries take precedence
    over legacy entries with the same name.

    Thread safety: all public methods that read or write state acquire ``_lock``.
    """

    def __init__(
        self,
        base_dir: str | Path,
        legacy_dir: Optional[str | Path] = None,
    ) -> None:
        self._base_dir = Path(base_dir)
        self._legacy_dir = Path(legacy_dir) if legacy_dir else None
        self._skills: dict[str, SkillEntry] = {}
        self._sent: set[str] = set()
        self._lock = threading.RLock()
        self._load_all()

    # ── Loading ─────────────────────────────────────────────────────────

    def _load_all(self) -> None:
        """Load skills from the new layout first, then fall back to legacy."""
        loaded_new = 0
        loaded_legacy = 0

        # New layout: {base_dir}/{provider}/{slug}/SKILL.md
        if self._base_dir.is_dir():
            for provider_dir in sorted(self._base_dir.iterdir()):
                if not provider_dir.is_dir():
                    continue
                provider = provider_dir.name
                if provider not in VALID_PROVIDERS:
                    logger.debug(
                        "skill registry: skipping non-provider dir %s",
                        provider_dir,
                    )
                    continue
                for slug_dir in sorted(provider_dir.iterdir()):
                    if not slug_dir.is_dir():
                        continue
                    skill_file = slug_dir / "SKILL.md"
                    if not skill_file.is_file():
                        continue
                    entry = self._load_entry_from_new_layout(
                        skill_file, provider, slug_dir.name
                    )
                    if entry:
                        self._skills[entry.name] = entry
                        loaded_new += 1

        # Legacy layout: flat files in {legacy_dir}/cloudguard-{slug}.md
        if self._legacy_dir and self._legacy_dir.is_dir():
            for skill_file in sorted(self._legacy_dir.glob("*.md")):
                entry = self._load_entry_from_legacy(skill_file)
                if entry and entry.name not in self._skills:
                    # Only add if not already loaded from new layout
                    self._skills[entry.name] = entry
                    loaded_legacy += 1

        logger.info(
            "SkillRegistry: loaded %d new-layout + %d legacy skills (%d total)",
            loaded_new, loaded_legacy, len(self._skills),
        )

    def _load_entry_from_new_layout(
        self, skill_file: Path, provider: str, slug: str
    ) -> Optional[SkillEntry]:
        """Load a skill from the new ``{provider}/{slug}/SKILL.md`` layout."""
        try:
            raw = skill_file.read_text(encoding="utf-8")
            meta, _body = _parse_frontmatter(raw)
        except OSError as e:
            logger.warning("skill registry: cannot read %s: %s", skill_file, e)
            return None

        name = meta.get("name") or f"{provider}:{slug}"
        if ":" not in name:
            name = f"{provider}:{name}"

        try:
            return SkillEntry(
                name=name,
                short_name=slug,
                provider=provider,
                description=meta.get("description", ""),
                when_to_use=meta.get("whenToUse") or meta.get("when_to_use", ""),
                category=meta.get("category", "system"),
                layer=int(meta["layer"]) if meta.get("layer") else None,
                requires=meta.get("requires") or [],
                context=meta.get("context", "inline"),
                source_path=str(skill_file),
            )
        except ValueError as e:
            logger.warning("skill registry: invalid skill %s: %s", skill_file, e)
            return None

    def _load_entry_from_legacy(self, skill_file: Path) -> Optional[SkillEntry]:
        """Load a skill from the legacy ``cloudguard-{slug}.md`` flat layout.

        Infers provider and category from the slug since legacy files lack
        structured frontmatter for those fields.
        """
        if skill_file.name in _LEGACY_IGNORE_FILENAMES:
            return None
        slug: Optional[str] = None
        for rx in _LEGACY_FILENAME_RES:
            m = rx.match(skill_file.name)
            if m:
                slug = m.group(1)
                break
        if slug is None:
            return None

        try:
            raw = skill_file.read_text(encoding="utf-8")
            meta, _body = _parse_frontmatter(raw)
        except OSError:
            return None

        provider, category = _infer_provider_category(slug)
        # Legacy frontmatter has 'name' = "cloudguard-{slug}" — replace with new format
        name = f"{provider}:{slug}"
        description = meta.get("description", _legacy_description(slug, raw))
        triggers = meta.get("triggers") or []
        when_to_use = (
            meta.get("whenToUse")
            or meta.get("when_to_use")
            or (f"Triggers: {', '.join(triggers[:5])}" if triggers else "")
        )

        try:
            return SkillEntry(
                name=name,
                short_name=slug,
                provider=provider,
                description=description,
                when_to_use=when_to_use,
                category=category,
                layer=None,
                requires=[],
                context="inline",
                source_path=str(skill_file),
            )
        except ValueError as e:
            logger.warning("skill registry: invalid legacy skill %s: %s", skill_file, e)
            return None

    # ── Lookup ──────────────────────────────────────────────────────────

    def get(self, name: str) -> Optional[SkillEntry]:
        """Resolve a skill by full name (``aws:iam``) or short name (``iam``).

        Short names are allowed only if unambiguous across providers. If two
        providers have the same short name (``aws:iam`` and ``azure:iam``),
        passing ``iam`` raises ``LookupError`` — the caller must qualify.
        """
        with self._lock:
            if name in self._skills:
                return self._skills[name]
            # Try short-name resolution
            matches = [s for s in self._skills.values() if s.short_name == name]
            if len(matches) == 1:
                return matches[0]
            if len(matches) > 1:
                qualified = ", ".join(s.name for s in matches)
                raise LookupError(
                    f"Ambiguous skill {name!r}; matches: {qualified}. "
                    f"Use the fully-qualified name."
                )
            return None

    def all(self) -> list[SkillEntry]:
        """Return all loaded skills."""
        with self._lock:
            return list(self._skills.values())

    def by_provider(self, provider: str) -> list[SkillEntry]:
        """Return all skills for one provider."""
        with self._lock:
            return [s for s in self._skills.values() if s.provider == provider]

    def by_category(self, category: str) -> list[SkillEntry]:
        """Return all skills in one category."""
        with self._lock:
            return [s for s in self._skills.values() if s.category == category]

    # ── Listing (budget-aware) ──────────────────────────────────────────

    def _filter_available(self, active_providers: Iterable[str]) -> list[SkillEntry]:
        """Return user-facing skills for the given active providers.

        ``internal`` skills are never user-facing — they're invoked by the
        agent's own machinery and don't belong in the listing.
        """
        active_set = set(active_providers)
        return [
            s for s in self._skills.values()
            if s.provider in active_set and s.provider != "internal"
        ]

    def _sort_for_listing(self, skills: list[SkillEntry]) -> list[SkillEntry]:
        """Sort skills by provider priority then alphabetically."""
        return sorted(
            skills,
            key=lambda s: (PROVIDER_PRIORITY.get(s.provider, 99), s.name),
        )

    def _format_entry(self, skill: SkillEntry) -> str:
        """Format one skill as a listing line."""
        desc = (
            f"{skill.description} - {skill.when_to_use}"
            if skill.when_to_use else skill.description
        )
        if len(desc) > MAX_LISTING_DESC_CHARS:
            desc = desc[: MAX_LISTING_DESC_CHARS - 1] + "…"
        return f"- {skill.name}: {desc}"

    def format_listing(
        self,
        context_window: int,
        active_providers: Iterable[str],
    ) -> str:
        """Return a budget-aware skill listing as a Markdown bullet list.

        If the full listing exceeds the budget (1% of context window in chars),
        falls back to name-only lines to fit more skills.

        Returns an empty string if no skills are available for the providers.
        """
        budget = int(context_window * CHARS_PER_TOKEN * SKILL_BUDGET_CONTEXT_PERCENT)
        with self._lock:
            available = self._filter_available(active_providers)
            available = self._sort_for_listing(available)

        if not available:
            return ""

        lines = [self._format_entry(s) for s in available]
        full = "\n".join(lines)

        if len(full) <= budget:
            return full

        # Over budget — try mixed: full descriptions until budget, then name-only
        result: list[str] = []
        used = 0
        for skill in available:
            full_line = self._format_entry(skill)
            short_line = f"- {skill.name}"
            chosen = full_line if used + len(full_line) + 1 <= budget else short_line
            result.append(chosen)
            used += len(chosen) + 1
        return "\n".join(result)

    def format_delta(
        self,
        context_window: int,
        active_providers: Iterable[str],
    ) -> Optional[str]:
        """Return a listing of only NEW skills (not yet sent this session).

        Returns ``None`` when nothing new to announce. The first call returns
        the full listing (with an "available" header); subsequent calls return
        only newly-added skills (with a "now available" header).
        """
        with self._lock:
            available = self._filter_available(active_providers)
            new_skills = [s for s in available if s.name not in self._sent]
            if not new_skills:
                return None
            for s in new_skills:
                self._sent.add(s.name)
            is_initial = len(self._sent) == len(new_skills)
            sorted_new = self._sort_for_listing(new_skills)

        # Format the new entries (no budget — delta is small by definition)
        lines = [self._format_entry(s) for s in sorted_new]
        body = "\n".join(lines)

        header = (
            "The following skills are available for use with the Skill tool:"
            if is_initial
            else "The following new skills are now available:"
        )
        return f"<system-reminder>\n{header}\n\n{body}\n</system-reminder>"

    # ── Content (lazy) ──────────────────────────────────────────────────

    def load_content(self, name: str) -> Optional[str]:
        """Return the full Markdown body of a skill (frontmatter stripped).

        Lazily reads from disk on first access; cached for subsequent calls.
        Returns ``None`` if the skill is unknown or the file is unreadable.
        """
        skill = self.get(name)
        if skill is None:
            return None

        with self._lock:
            if skill._content is not None:
                return skill._content

        try:
            raw = Path(skill.source_path).read_text(encoding="utf-8")
            _meta, body = _parse_frontmatter(raw)
        except OSError as e:
            logger.warning("skill registry: cannot read content %s: %s",
                           skill.source_path, e)
            return None

        with self._lock:
            skill._content = body
        return body

    # ── Session lifecycle ───────────────────────────────────────────────

    def reset_tracking(self) -> None:
        """Clear the delta-tracking set (call on session reset or compaction)."""
        with self._lock:
            self._sent.clear()

    def sent_count(self) -> int:
        """Number of skills already announced in this session (for diagnostics)."""
        with self._lock:
            return len(self._sent)

    # ── Diagnostics ─────────────────────────────────────────────────────

    def stats(self) -> dict:
        """Summary statistics — total, per-provider, per-category counts."""
        with self._lock:
            by_provider: dict[str, int] = {}
            by_category: dict[str, int] = {}
            for s in self._skills.values():
                by_provider[s.provider] = by_provider.get(s.provider, 0) + 1
                by_category[s.category] = by_category.get(s.category, 0) + 1
            return {
                "total": len(self._skills),
                "by_provider": by_provider,
                "by_category": by_category,
                "sent_this_session": len(self._sent),
            }


# ── Legacy inference helpers (provider + category from slug) ───────────────

def _infer_provider_category(slug: str) -> tuple[str, str]:
    """Infer (provider, category) from a legacy slug like 'iam-aws'.

    Used only for backward-compat loading. New-layout skills declare these
    explicitly in their frontmatter.
    """
    # Provider inference
    if slug in (
        "iam-aws", "s3-exposure", "cis-benchmarks", "cloud-misconfiguration",
        "cloud-metadata-exposure", "logging-audit", "privileged-access",
        "public-exposure", "secrets-manager-audit", "patch-status",
        "service-hardening-aws", "waf-assessment", "compliance",
    ):
        provider = "aws"
    elif slug == "iam-azure":
        provider = "azure"
    elif slug == "iam-gcp":
        provider = "gcp"
    elif slug in (
        "core", "assess", "environment-map", "session-storage",
        "kernel-guardian", "notebook-ops", "security-analytics",
        "mermaid", "latex-report", "tools", "workflow", "repo",
    ):
        provider = "internal"
    else:
        provider = "shared"  # network/dns/docker/kubernetes/etc.

    # Category inference
    if slug in ("iam-aws", "iam-azure", "iam-gcp", "identity-federation", "privileged-access"):
        category = "identity"
    elif slug in ("compliance", "cis-benchmarks", "cloud-misconfiguration", "terraform-iac-security"):
        category = "posture"
    elif slug in ("network-exposure", "public-exposure", "cloud-metadata-exposure",
                  "dns-security", "tls-certificate", "waf-assessment"):
        category = "network"
    elif slug in ("kubernetes-security", "container-registry", "docker-security",
                  "patch-status", "vulnerability-scanning"):
        category = "workload"
    elif slug in ("s3-exposure", "database-security", "secrets-exposure",
                  "secrets-manager-audit", "data-loss-prevention"):
        category = "data"
    elif slug in ("ssh-hardening", "service-hardening-aws"):
        category = "hardening"
    elif slug in ("logging-audit", "security-analytics"):
        category = "detection"
    elif slug in ("attack-chain-analysis", "supply-chain-integrity"):
        category = "chain"
    elif slug in ("assess", "core", "environment-map", "session-storage"):
        category = "orchestration"
    elif slug in ("mermaid", "latex-report"):
        category = "reporting"
    else:
        category = "system"

    return provider, category


def _legacy_description(slug: str, raw: str) -> str:
    """Extract a one-line description from a legacy skill's body.

    Looks for the first ``## `` heading or the first non-blank line after
    the frontmatter.
    """
    # Strip frontmatter
    _meta, body = _parse_frontmatter(raw)
    for line in body.splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        if stripped.startswith("## "):
            return stripped[3:].strip()
        if stripped.startswith("# "):
            return stripped[2:].strip()
        # First real prose line
        if not stripped.startswith("#"):
            return stripped[:200]
    return f"CloudGuard {slug} skill"

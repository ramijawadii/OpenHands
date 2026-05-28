"""Unit tests for openhands.services.skills.registry."""
from __future__ import annotations

import textwrap
from pathlib import Path

import pytest

from openhands.services.skills.registry import (
    CHARS_PER_TOKEN,
    MAX_LISTING_DESC_CHARS,
    SKILL_BUDGET_CONTEXT_PERCENT,
    SkillEntry,
    SkillRegistry,
    _parse_frontmatter,
)


# ── Frontmatter parsing ─────────────────────────────────────────────────────


class TestParseFrontmatter:
    def test_no_frontmatter_returns_empty_meta_and_full_body(self):
        raw = "Just a body, no frontmatter."
        meta, body = _parse_frontmatter(raw)
        assert meta == {}
        assert body == raw

    def test_simple_key_value_frontmatter(self):
        raw = textwrap.dedent("""\
            ---
            name: aws:iam
            description: Some description
            ---
            Body content here.
            """)
        meta, body = _parse_frontmatter(raw)
        assert meta["name"] == "aws:iam"
        assert meta["description"] == "Some description"
        assert body.startswith("Body content")

    def test_list_frontmatter(self):
        raw = textwrap.dedent("""\
            ---
            name: aws:iam
            requires:
              - aws-cli
              - aws-credentials
            ---
            Body
            """)
        meta, _body = _parse_frontmatter(raw)
        assert meta["requires"] == ["aws-cli", "aws-credentials"]

    def test_quoted_values_are_stripped(self):
        raw = textwrap.dedent("""\
            ---
            description: "Quoted value"
            name: 'single quoted'
            ---
            Body
            """)
        meta, _ = _parse_frontmatter(raw)
        assert meta["description"] == "Quoted value"
        assert meta["name"] == "single quoted"


# ── Fixtures ────────────────────────────────────────────────────────────────


@pytest.fixture
def skills_dir(tmp_path: Path) -> Path:
    """Create a temporary skills tree with a few test skills."""
    base = tmp_path / "skills"

    # aws:iam
    aws_iam = base / "aws" / "iam"
    aws_iam.mkdir(parents=True)
    (aws_iam / "SKILL.md").write_text(textwrap.dedent("""\
        ---
        name: aws:iam
        description: AWS IAM assessment
        whenToUse: When assessing AWS IAM users, roles, and policies
        provider: aws
        category: identity
        layer: 1
        context: inline
        requires:
          - aws-cli
        ---
        Full body content for the AWS IAM skill.
        """))

    # aws:s3
    aws_s3 = base / "aws" / "s3-exposure"
    aws_s3.mkdir(parents=True)
    (aws_s3 / "SKILL.md").write_text(textwrap.dedent("""\
        ---
        name: aws:s3-exposure
        description: S3 bucket exposure
        whenToUse: For S3 bucket public access checks
        provider: aws
        category: data
        context: inline
        ---
        S3 body.
        """))

    # shared:network-exposure
    shared_net = base / "shared" / "network-exposure"
    shared_net.mkdir(parents=True)
    (shared_net / "SKILL.md").write_text(textwrap.dedent("""\
        ---
        name: shared:network-exposure
        description: Network exposure scan
        whenToUse: For network/firewall/security-group exposure
        provider: shared
        category: network
        context: inline
        ---
        Network body.
        """))

    # internal:core
    internal_core = base / "internal" / "core"
    internal_core.mkdir(parents=True)
    (internal_core / "SKILL.md").write_text(textwrap.dedent("""\
        ---
        name: internal:core
        description: CloudGuard core foundation
        whenToUse: Always-on identity block
        provider: internal
        category: orchestration
        context: inline
        ---
        Core body.
        """))

    return base


@pytest.fixture
def legacy_dir(tmp_path: Path) -> Path:
    """Create a temporary legacy flat directory."""
    base = tmp_path / "legacy"
    base.mkdir()
    (base / "iam-aws.md").write_text(textwrap.dedent("""\
        ---
        name: cloudguard-iam-aws
        triggers:
          - iam
          - aws iam
        ---

        ## AWS IAM Legacy Skill

        Legacy IAM body.
        """))
    (base / "kubernetes-security.md").write_text(textwrap.dedent("""\
        ---
        name: cloudguard-kubernetes-security
        triggers:
          - kubernetes
        ---

        ## Kubernetes Security

        K8s body.
        """))
    # Should be ignored
    (base / "repo.md").write_text("metadata file")
    (base / "containers.md").write_text("aggregator file")
    return base


# ── SkillRegistry — loading ─────────────────────────────────────────────────


class TestSkillRegistryLoading:
    def test_loads_new_layout(self, skills_dir):
        reg = SkillRegistry(base_dir=skills_dir)
        assert reg.stats()["total"] == 4

    def test_loads_legacy_layout(self, legacy_dir, tmp_path):
        # Empty new-layout dir + populated legacy dir
        empty = tmp_path / "empty"
        empty.mkdir()
        reg = SkillRegistry(base_dir=empty, legacy_dir=legacy_dir)
        assert reg.stats()["total"] == 2  # iam-aws + kubernetes-security
        assert reg.get("iam-aws") is not None
        assert reg.get("kubernetes-security") is not None

    def test_legacy_ignores_metadata_and_aggregators(self, legacy_dir, tmp_path):
        empty = tmp_path / "empty"
        empty.mkdir()
        reg = SkillRegistry(base_dir=empty, legacy_dir=legacy_dir)
        # repo.md (metadata) and containers.md (aggregator) MUST NOT load
        assert reg.get("repo") is None
        assert reg.get("containers") is None

    def test_new_layout_overrides_legacy_on_name_collision(
        self, skills_dir, legacy_dir
    ):
        # Legacy has iam-aws; new layout has aws:iam. Different names — both load.
        # Make legacy have a same-name skill to test true collision:
        (legacy_dir / "iam.md").write_text(textwrap.dedent("""\
            ---
            triggers: [iam]
            ---
            ## IAM legacy

            Legacy IAM (would resolve to aws:iam after slug inference).
            """))
        reg = SkillRegistry(base_dir=skills_dir, legacy_dir=legacy_dir)
        # aws:iam should come from new layout (its body starts with "Full body")
        body = reg.load_content("aws:iam")
        assert body and body.startswith("Full body content")

    def test_handles_missing_directories_gracefully(self, tmp_path):
        # Both dirs nonexistent — should load 0 skills, not crash
        reg = SkillRegistry(
            base_dir=tmp_path / "nope1",
            legacy_dir=tmp_path / "nope2",
        )
        assert reg.stats()["total"] == 0


# ── Lookup ──────────────────────────────────────────────────────────────────


class TestSkillRegistryLookup:
    def test_get_by_full_name(self, skills_dir):
        reg = SkillRegistry(base_dir=skills_dir)
        e = reg.get("aws:iam")
        assert e is not None and e.name == "aws:iam"

    def test_get_by_short_name_unambiguous(self, skills_dir):
        reg = SkillRegistry(base_dir=skills_dir)
        e = reg.get("s3-exposure")
        assert e is not None and e.name == "aws:s3-exposure"

    def test_get_by_short_name_ambiguous_raises(self, tmp_path):
        # Build a registry with conflicting short names
        base = tmp_path / "skills"
        for prov in ("aws", "azure"):
            d = base / prov / "iam"
            d.mkdir(parents=True)
            (d / "SKILL.md").write_text(textwrap.dedent(f"""\
                ---
                name: {prov}:iam
                description: {prov} IAM
                whenToUse: for {prov}
                provider: {prov}
                category: identity
                context: inline
                ---
                body
                """))
        reg = SkillRegistry(base_dir=base)
        with pytest.raises(LookupError):
            reg.get("iam")

    def test_get_unknown_returns_none(self, skills_dir):
        reg = SkillRegistry(base_dir=skills_dir)
        assert reg.get("does-not-exist") is None

    def test_by_provider(self, skills_dir):
        reg = SkillRegistry(base_dir=skills_dir)
        aws = reg.by_provider("aws")
        names = {s.name for s in aws}
        assert names == {"aws:iam", "aws:s3-exposure"}

    def test_by_category(self, skills_dir):
        reg = SkillRegistry(base_dir=skills_dir)
        identity = reg.by_category("identity")
        assert len(identity) == 1
        assert identity[0].name == "aws:iam"


# ── Listing ─────────────────────────────────────────────────────────────────


class TestFormatListing:
    def test_listing_includes_only_active_providers(self, skills_dir):
        reg = SkillRegistry(base_dir=skills_dir)
        listing = reg.format_listing(200_000, ["aws"])
        assert "aws:iam" in listing
        assert "aws:s3-exposure" in listing
        assert "shared:network-exposure" not in listing
        assert "internal:core" not in listing  # internal is always excluded

    def test_listing_excludes_internal_even_if_in_active_providers(self, skills_dir):
        reg = SkillRegistry(base_dir=skills_dir)
        listing = reg.format_listing(200_000, ["aws", "internal"])
        assert "internal:core" not in listing

    def test_listing_truncates_long_descriptions(self, tmp_path):
        base = tmp_path / "skills"
        d = base / "aws" / "verbose"
        d.mkdir(parents=True)
        long_desc = "x" * 500
        (d / "SKILL.md").write_text(textwrap.dedent(f"""\
            ---
            name: aws:verbose
            description: {long_desc}
            whenToUse: never
            provider: aws
            category: posture
            context: inline
            ---
            body
            """))
        reg = SkillRegistry(base_dir=base)
        listing = reg.format_listing(200_000, ["aws"])
        # Should be truncated to MAX_LISTING_DESC_CHARS + ellipsis
        assert "…" in listing
        # The full long_desc should NOT appear
        assert long_desc not in listing

    def test_listing_falls_back_to_name_only_when_budget_exceeded(self, tmp_path):
        base = tmp_path / "skills"
        # Create 100 skills with full descriptions
        for i in range(100):
            d = base / "aws" / f"skill{i:03d}"
            d.mkdir(parents=True)
            (d / "SKILL.md").write_text(textwrap.dedent(f"""\
                ---
                name: aws:skill{i:03d}
                description: A reasonably long description that takes up many bytes per line
                whenToUse: When testing budget overflow with many skills
                provider: aws
                category: posture
                context: inline
                ---
                body
                """))
        reg = SkillRegistry(base_dir=base)
        # Tiny context window forces budget overflow
        listing = reg.format_listing(2_000, ["aws"])
        lines = listing.splitlines()
        # Some lines should be name-only ("- aws:skillNNN" with no colon-description)
        name_only = [line for line in lines if line.count(":") == 1 and "description" not in line.lower()]
        assert len(name_only) > 0

    def test_listing_sort_order_shared_then_aws_then_azure(self, tmp_path):
        base = tmp_path / "skills"
        for prov in ("aws", "azure", "shared"):
            d = base / prov / "thing"
            d.mkdir(parents=True)
            (d / "SKILL.md").write_text(textwrap.dedent(f"""\
                ---
                name: {prov}:thing
                description: {prov} thing
                whenToUse: ws
                provider: {prov}
                category: posture
                context: inline
                ---
                body
                """))
        reg = SkillRegistry(base_dir=base)
        listing = reg.format_listing(200_000, ["aws", "azure", "shared"])
        lines = listing.splitlines()
        # Expected order: shared (-1), aws (0), azure (1)
        assert "shared:thing" in lines[0]
        assert "aws:thing" in lines[1]
        assert "azure:thing" in lines[2]


# ── Delta tracking ──────────────────────────────────────────────────────────


class TestFormatDelta:
    def test_first_call_returns_full_listing_with_initial_header(self, skills_dir):
        reg = SkillRegistry(base_dir=skills_dir)
        delta = reg.format_delta(200_000, ["aws"])
        assert delta is not None
        assert "available for use" in delta
        assert "aws:iam" in delta
        assert "aws:s3-exposure" in delta

    def test_second_call_returns_none_when_nothing_new(self, skills_dir):
        reg = SkillRegistry(base_dir=skills_dir)
        reg.format_delta(200_000, ["aws"])  # first call announces both
        delta = reg.format_delta(200_000, ["aws"])
        assert delta is None

    def test_adding_provider_mid_session_returns_new_skills_only(self, skills_dir):
        reg = SkillRegistry(base_dir=skills_dir)
        reg.format_delta(200_000, ["aws"])  # announces aws:* only
        delta = reg.format_delta(200_000, ["aws", "shared"])
        assert delta is not None
        assert "now available" in delta
        assert "shared:network-exposure" in delta
        assert "aws:iam" not in delta  # already announced

    def test_reset_tracking_re_announces_everything(self, skills_dir):
        reg = SkillRegistry(base_dir=skills_dir)
        reg.format_delta(200_000, ["aws"])
        reg.reset_tracking()
        delta = reg.format_delta(200_000, ["aws"])
        assert delta is not None
        assert "available for use" in delta

    def test_sent_count(self, skills_dir):
        reg = SkillRegistry(base_dir=skills_dir)
        assert reg.sent_count() == 0
        reg.format_delta(200_000, ["aws"])
        assert reg.sent_count() == 2
        reg.format_delta(200_000, ["aws", "shared"])
        assert reg.sent_count() == 3


# ── Content loading ─────────────────────────────────────────────────────────


class TestLoadContent:
    def test_load_content_returns_body_without_frontmatter(self, skills_dir):
        reg = SkillRegistry(base_dir=skills_dir)
        body = reg.load_content("aws:iam")
        assert body is not None
        assert body.startswith("Full body content")
        assert "---" not in body  # frontmatter stripped

    def test_load_content_caches_after_first_read(self, skills_dir):
        reg = SkillRegistry(base_dir=skills_dir)
        body1 = reg.load_content("aws:iam")
        body2 = reg.load_content("aws:iam")
        assert body1 == body2

    def test_load_content_unknown_skill_returns_none(self, skills_dir):
        reg = SkillRegistry(base_dir=skills_dir)
        assert reg.load_content("nope:nothing") is None

    def test_load_content_short_name(self, skills_dir):
        reg = SkillRegistry(base_dir=skills_dir)
        body = reg.load_content("iam")  # short name → aws:iam
        assert body is not None and body.startswith("Full body")


# ── Validation ──────────────────────────────────────────────────────────────


class TestSkillEntryValidation:
    def test_invalid_provider_raises(self):
        with pytest.raises(ValueError):
            SkillEntry(
                name="foo:bar", short_name="bar", provider="invalid_provider",
                description="d", when_to_use="w",
                category="identity", layer=None, requires=[],
                context="inline", source_path="/x",
            )

    def test_invalid_category_raises(self):
        with pytest.raises(ValueError):
            SkillEntry(
                name="aws:foo", short_name="foo", provider="aws",
                description="d", when_to_use="w",
                category="invalid_cat", layer=None, requires=[],
                context="inline", source_path="/x",
            )

    def test_invalid_context_raises(self):
        with pytest.raises(ValueError):
            SkillEntry(
                name="aws:foo", short_name="foo", provider="aws",
                description="d", when_to_use="w",
                category="identity", layer=None, requires=[],
                context="bogus", source_path="/x",
            )

    def test_valid_entry_passes(self):
        # Should not raise
        SkillEntry(
            name="aws:foo", short_name="foo", provider="aws",
            description="d", when_to_use="w",
            category="identity", layer=1, requires=["aws-cli"],
            context="inline", source_path="/x",
        )


# ── Stats ───────────────────────────────────────────────────────────────────


class TestStats:
    def test_stats_reports_correct_counts(self, skills_dir):
        reg = SkillRegistry(base_dir=skills_dir)
        s = reg.stats()
        assert s["total"] == 4
        assert s["by_provider"]["aws"] == 2
        assert s["by_provider"]["shared"] == 1
        assert s["by_provider"]["internal"] == 1
        assert s["by_category"]["identity"] == 1
        assert s["by_category"]["data"] == 1
        assert s["sent_this_session"] == 0

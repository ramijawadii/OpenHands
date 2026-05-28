"""Regression tests for the [SKILL_READY:...] dispatch regex.

The agent's dispatch flow is:
    1. IPython kernel prints "[SKILL_READY:name]" (or "[SKILL_READY:name:args=...]")
    2. CloudGuardAgent._skill_aware_process_obs runs _SKILL_READY_RE.search on
       the observation content
    3. On match, calls _agent_load_skill(name, args) to inject the skill body

The regex MUST handle both legacy short names ('iam-aws') and qualified
provider:slug names ('aws:iam-aws'), with optional ':args=' suffix.
"""
from __future__ import annotations

from openhands.agenthub.cloudguard_agent.cloudguard_agent import _SKILL_READY_RE


class TestSkillReadyRegex:
    def test_legacy_short_name(self):
        m = _SKILL_READY_RE.search("[SKILL_READY:iam-aws]")
        assert m is not None
        assert m.group(1) == "iam-aws"
        assert m.group(2) is None

    def test_qualified_provider_name(self):
        m = _SKILL_READY_RE.search("[SKILL_READY:aws:iam-aws]")
        assert m is not None
        assert m.group(1) == "aws:iam-aws"
        assert m.group(2) is None

    def test_qualified_shared_provider(self):
        m = _SKILL_READY_RE.search("[SKILL_READY:shared:network-exposure]")
        assert m is not None
        assert m.group(1) == "shared:network-exposure"

    def test_legacy_with_args(self):
        m = _SKILL_READY_RE.search("[SKILL_READY:iam-aws:args=focus on admin]")
        assert m is not None
        assert m.group(1) == "iam-aws"
        assert m.group(2) == "focus on admin"

    def test_qualified_with_args(self):
        m = _SKILL_READY_RE.search("[SKILL_READY:aws:iam-aws:args=ROLE=foo]")
        assert m is not None
        assert m.group(1) == "aws:iam-aws"
        assert m.group(2) == "ROLE=foo"

    def test_no_match_on_garbage(self):
        assert _SKILL_READY_RE.search("not a skill ready marker") is None

    def test_no_match_when_brackets_missing(self):
        assert _SKILL_READY_RE.search("SKILL_READY:iam-aws") is None

    def test_match_extracts_from_surrounding_text(self):
        out = "Some kernel output\n[SKILL_READY:iam-aws]\nMore output"
        m = _SKILL_READY_RE.search(out)
        assert m is not None
        assert m.group(1) == "iam-aws"

    def test_args_with_special_chars_within_brackets(self):
        # args can contain anything except ']'
        m = _SKILL_READY_RE.search("[SKILL_READY:s3:args={\"bucket\": \"foo\"}]")
        assert m is not None
        assert m.group(1) == "s3"
        assert m.group(2) == '{"bucket": "foo"}'

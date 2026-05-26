"""
Tests for openhands.llm.context_limits

Coverage:
  - get_context_window: known models, prefix matching, env override, default
  - get_output_limit: known models, escalated vs default, fallback
  - context_pressure: arithmetic correctness, clamping at 1.0
  - should_auto_compact: below, at, and above threshold
  - Longest-prefix wins when multiple table keys match
  - Environment override takes highest priority
"""
from __future__ import annotations

import os

import pytest

from openhands.llm.context_limits import (
    AUTO_COMPACT_THRESHOLD,
    CAPPED_DEFAULT_MAX_TOKENS,
    COMPACT_MAX_OUTPUT_TOKENS,
    ESCALATED_MAX_TOKENS,
    MODEL_CONTEXT_WINDOW_DEFAULT,
    context_pressure,
    get_context_window,
    get_output_limit,
    should_auto_compact,
)


# ---------------------------------------------------------------------------
# get_context_window
# ---------------------------------------------------------------------------

class TestGetContextWindow:
    def test_exact_model_name(self):
        assert get_context_window("claude-sonnet-4-6") == 200_000

    def test_substring_match(self):
        # Provider prefix: "anthropic/claude-sonnet-4-6"
        assert get_context_window("anthropic/claude-sonnet-4-6") == 200_000

    def test_gemini_window(self):
        assert get_context_window("gemini-2.5-pro") == 1_048_576

    def test_gemini_flash_window(self):
        assert get_context_window("vertex_ai/gemini-2.5-flash") == 1_048_576

    def test_unknown_model_returns_default(self):
        assert get_context_window("some-unknown-model-xyz") == MODEL_CONTEXT_WINDOW_DEFAULT

    def test_env_override_highest_priority(self, monkeypatch):
        monkeypatch.setenv("OPENHANDS_MAX_CONTEXT_TOKENS", "42000")
        assert get_context_window("claude-sonnet-4-6") == 42_000

    def test_env_override_non_digit_ignored(self, monkeypatch):
        monkeypatch.setenv("OPENHANDS_MAX_CONTEXT_TOKENS", "not-a-number")
        # Falls through to table
        assert get_context_window("claude-sonnet-4-6") == 200_000

    def test_env_override_empty_string_ignored(self, monkeypatch):
        monkeypatch.setenv("OPENHANDS_MAX_CONTEXT_TOKENS", "")
        assert get_context_window("claude-sonnet-4-6") == 200_000

    def test_longest_prefix_wins(self):
        """
        "claude-opus-4-7" is longer than "claude-opus" — the longer key must win.
        """
        result = get_context_window("claude-opus-4-7")
        assert result == 200_000

    def test_haiku_model(self):
        assert get_context_window("claude-haiku-4-5") == 200_000

    def test_gpt4o_window(self):
        assert get_context_window("gpt-4o") == 128_000


# ---------------------------------------------------------------------------
# get_output_limit
# ---------------------------------------------------------------------------

class TestGetOutputLimit:
    def test_sonnet_default(self):
        assert get_output_limit("claude-sonnet-4-6") == 32_000

    def test_sonnet_escalated(self):
        assert get_output_limit("claude-sonnet-4-6", escalated=True) == 128_000

    def test_haiku_default(self):
        assert get_output_limit("claude-haiku-4-5") == 16_000

    def test_gemini_flash_default(self):
        assert get_output_limit("gemini-2.5-flash") == 8_192

    def test_gemini_flash_escalated(self):
        assert get_output_limit("gemini-2.5-flash", escalated=True) == 65_536

    def test_unknown_model_default_returns_capped(self):
        assert get_output_limit("unknown-model") == CAPPED_DEFAULT_MAX_TOKENS

    def test_unknown_model_escalated_returns_escalated(self):
        assert get_output_limit("unknown-model", escalated=True) == ESCALATED_MAX_TOKENS

    def test_provider_prefix_match(self):
        # "anthropic/claude-sonnet-4-6" contains "claude-sonnet-4-6"
        assert get_output_limit("anthropic/claude-sonnet-4-6") == 32_000


# ---------------------------------------------------------------------------
# context_pressure
# ---------------------------------------------------------------------------

class TestContextPressure:
    def test_zero_tokens_is_zero(self):
        assert context_pressure(0, 0, "claude-sonnet-4-6") == 0.0

    def test_half_window(self):
        window = 200_000
        pressure = context_pressure(window // 2, 0, "claude-sonnet-4-6")
        assert abs(pressure - 0.5) < 1e-9

    def test_full_window_returns_one(self):
        window = 200_000
        pressure = context_pressure(window, 0, "claude-sonnet-4-6")
        assert pressure == 1.0

    def test_over_window_clamped_to_one(self):
        window = 200_000
        pressure = context_pressure(window + 10_000, 0, "claude-sonnet-4-6")
        assert pressure == 1.0

    def test_prompt_and_completion_combined(self):
        # 100K prompt + 50K completion = 150K / 200K = 0.75
        pressure = context_pressure(100_000, 50_000, "claude-sonnet-4-6")
        assert abs(pressure - 0.75) < 1e-9

    def test_gemini_larger_window_lower_pressure(self):
        # Same token count on Gemini 2.5 (1M window) → much lower pressure
        pressure = context_pressure(100_000, 50_000, "gemini-2.5-pro")
        assert pressure < 0.2

    def test_unknown_model_uses_default_window(self):
        pressure = context_pressure(0, 0, "unknown-model")
        assert pressure == 0.0


# ---------------------------------------------------------------------------
# should_auto_compact
# ---------------------------------------------------------------------------

class TestShouldAutoCompact:
    def test_returns_false_when_well_below_threshold(self):
        # 10K / 200K = 5%
        assert should_auto_compact(10_000, 0, "claude-sonnet-4-6") is False

    def test_returns_false_just_below_threshold(self):
        # 94% of 200K = 188K
        assert should_auto_compact(188_000, 0, "claude-sonnet-4-6") is False

    def test_returns_true_at_exact_threshold(self):
        # 95% of 200K = 190K
        assert should_auto_compact(190_000, 0, "claude-sonnet-4-6") is True

    def test_returns_true_above_threshold(self):
        # 196K / 200K = 98%
        assert should_auto_compact(196_000, 0, "claude-sonnet-4-6") is True

    def test_combined_prompt_and_completion(self):
        # 100K prompt + 91K completion = 191K / 200K = 95.5%
        assert should_auto_compact(100_000, 91_000, "claude-sonnet-4-6") is True

    def test_gemini_same_tokens_not_compact(self):
        # Gemini window is 1M; 190K is only 18%
        assert should_auto_compact(190_000, 0, "gemini-2.5-pro") is False

    def test_gemini_at_threshold(self):
        # Gemini window is 1_048_576; 95% = 996_147.2. Use 997_000 to be clearly above.
        assert should_auto_compact(997_000, 0, "gemini-2.5-pro") is True

    def test_unknown_model_uses_default_window(self):
        # Default window is 200K; same thresholds apply
        assert should_auto_compact(190_000, 0, "unknown-model-xyz") is True


# ---------------------------------------------------------------------------
# Constant sanity checks
# ---------------------------------------------------------------------------

class TestConstants:
    def test_auto_compact_threshold_is_point_95(self):
        assert AUTO_COMPACT_THRESHOLD == 0.95

    def test_compact_max_is_20k(self):
        assert COMPACT_MAX_OUTPUT_TOKENS == 20_000

    def test_capped_default_is_8k(self):
        assert CAPPED_DEFAULT_MAX_TOKENS == 8_000

    def test_escalated_is_64k(self):
        assert ESCALATED_MAX_TOKENS == 64_000

    def test_threshold_strictly_between_0_and_1(self):
        assert 0.0 < AUTO_COMPACT_THRESHOLD < 1.0

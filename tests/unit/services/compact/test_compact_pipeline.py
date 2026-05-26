"""
Tests for openhands.services.compact.compact_pipeline

Coverage:
  - _format_compact_summary: strips <analysis>, unwraps <summary>, passthrough
  - build_boundary_marker: structure and types
  - get_compact_user_summary_message: content, transcript path, continue instructions
  - _strip_images: image/document blocks replaced; string content unchanged
  - _group_into_api_rounds: grouping logic, system prefix, single round
  - _truncate_oldest_round: drops first round, single-round unchanged
  - compact_conversation: success path, PTL retry, non-PTL error propagation,
    PTL retry exhaustion, custom instructions, transcript path included
  - Prompt constants: structural checks (NO_TOOLS_PREAMBLE, BASE_COMPACT_PROMPT,
    NO_TOOLS_TRAILER contain required phrases)
"""
from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest

from openhands.services.compact.compact_pipeline import (
    BASE_COMPACT_PROMPT,
    COMPACT_MAX_OUTPUT_TOKENS,
    MAX_PTL_RETRIES,
    NO_TOOLS_PREAMBLE,
    NO_TOOLS_TRAILER,
    _format_compact_summary,
    _group_into_api_rounds,
    _strip_images,
    _summarize_with_ptl_retry,
    _truncate_oldest_round,
    build_boundary_marker,
    compact_conversation,
    get_compact_user_summary_message,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_llm(content: str = "Summary text") -> MagicMock:
    """Return a mock LLM whose completion() returns *content*."""
    mock = MagicMock()
    resp = MagicMock()
    resp.choices[0].message.content = content
    mock.completion.return_value = resp
    return mock


def _messages(n: int = 2) -> list[dict]:
    result = []
    for i in range(n):
        result.append({"role": "user",      "content": f"question {i}"})
        result.append({"role": "assistant", "content": f"answer {i}"})
    return result


# ---------------------------------------------------------------------------
# _format_compact_summary
# ---------------------------------------------------------------------------

class TestFormatCompactSummary:
    def test_strips_analysis_block(self):
        raw = "<analysis>model thinking here</analysis>\nActual summary"
        assert _format_compact_summary(raw) == "Actual summary"

    def test_strips_multiline_analysis(self):
        raw = "<analysis>\nline 1\nline 2\n</analysis>\nReal content"
        assert _format_compact_summary(raw) == "Real content"

    def test_unwraps_summary_tag(self):
        raw = "<summary>\nContent here\n</summary>"
        assert _format_compact_summary(raw) == "Content here"

    def test_unwraps_summary_tag_no_trailing_newline(self):
        raw = "<summary>Content here</summary>"
        assert _format_compact_summary(raw) == "Content here"

    def test_passthrough_plain_text(self):
        raw = "Plain text summary"
        assert _format_compact_summary(raw) == "Plain text summary"

    def test_passthrough_empty_string(self):
        assert _format_compact_summary("") == ""

    def test_analysis_and_summary_tags_both_present(self):
        raw = "<analysis>thinking</analysis>\n<summary>\nFinal\n</summary>"
        assert _format_compact_summary(raw) == "Final"

    def test_does_not_strip_unrelated_xml(self):
        raw = "Summary with <code>snippet</code> inside"
        result = _format_compact_summary(raw)
        assert "<code>" in result

    def test_strips_whitespace_after_analysis(self):
        raw = "<analysis>x</analysis>  \n  Content"
        assert _format_compact_summary(raw) == "Content"


# ---------------------------------------------------------------------------
# build_boundary_marker
# ---------------------------------------------------------------------------

class TestBuildBoundaryMarker:
    def test_type_field(self):
        marker = build_boundary_marker("summary text", 50_000)
        assert marker["type"] == "summary"

    def test_summary_field(self):
        marker = build_boundary_marker("My summary", 1000)
        assert marker["summary"] == "My summary"

    def test_pre_compact_tokens(self):
        marker = build_boundary_marker("s", 98_765)
        assert marker["pre_compact_tokens"] == 98_765

    def test_timestamp_is_float(self):
        marker = build_boundary_marker("s", 100)
        assert isinstance(marker["timestamp"], float)
        assert marker["timestamp"] > 0

    def test_zero_tokens_allowed(self):
        marker = build_boundary_marker("empty", 0)
        assert marker["pre_compact_tokens"] == 0


# ---------------------------------------------------------------------------
# get_compact_user_summary_message
# ---------------------------------------------------------------------------

class TestGetCompactUserSummaryMessage:
    def test_contains_summary_text(self):
        msg = get_compact_user_summary_message("My summary text", None)
        assert "My summary text" in msg

    def test_header_present(self):
        msg = get_compact_user_summary_message("s", None)
        assert "continued from a previous conversation" in msg

    def test_suppress_true_no_follow_up(self):
        msg = get_compact_user_summary_message("s", None, suppress_follow_up_questions=True)
        assert "without asking the user any further questions" in msg

    def test_suppress_false_different_instruction(self):
        msg = get_compact_user_summary_message("s", None, suppress_follow_up_questions=False)
        assert "compacted" in msg.lower()
        assert "without asking" not in msg

    def test_with_transcript_path(self):
        msg = get_compact_user_summary_message(
            "summary", "/tmp/session-abc.jsonl"
        )
        assert "/tmp/session-abc.jsonl" in msg

    def test_without_transcript_path_no_file_reference(self):
        msg = get_compact_user_summary_message("s", None)
        assert "read the full transcript" not in msg

    def test_default_suppress_is_true(self):
        msg = get_compact_user_summary_message("s", None)
        assert "without asking the user any further questions" in msg


# ---------------------------------------------------------------------------
# _strip_images
# ---------------------------------------------------------------------------

class TestStripImages:
    def test_replaces_image_block(self):
        messages = [{"role": "user", "content": [{"type": "image", "source": "data"}]}]
        result = _strip_images(messages)
        assert result[0]["content"][0]["type"] == "text"
        assert "image" in result[0]["content"][0]["text"]
        assert "removed for compaction" in result[0]["content"][0]["text"]

    def test_replaces_document_block(self):
        messages = [{"role": "user", "content": [{"type": "document", "data": "..."}]}]
        result = _strip_images(messages)
        assert "document" in result[0]["content"][0]["text"]

    def test_preserves_text_block(self):
        messages = [{"role": "user", "content": [{"type": "text", "text": "hello"}]}]
        result = _strip_images(messages)
        assert result[0]["content"][0]["text"] == "hello"

    def test_passthrough_string_content(self):
        messages = [{"role": "user", "content": "plain text"}]
        result = _strip_images(messages)
        assert result == messages

    def test_mixed_blocks(self):
        messages = [{"role": "user", "content": [
            {"type": "image", "source": "data"},
            {"type": "text", "text": "caption"},
        ]}]
        result = _strip_images(messages)
        assert len(result[0]["content"]) == 2
        assert result[0]["content"][0]["type"] == "text"
        assert result[0]["content"][1]["text"] == "caption"

    def test_empty_messages(self):
        assert _strip_images([]) == []

    def test_does_not_mutate_original(self):
        original = [{"role": "user", "content": [{"type": "image"}]}]
        _ = _strip_images(original)
        # Original should still have type "image"
        assert original[0]["content"][0]["type"] == "image"


# ---------------------------------------------------------------------------
# _group_into_api_rounds
# ---------------------------------------------------------------------------

class TestGroupIntoApiRounds:
    def test_two_full_rounds(self):
        msgs = [
            {"role": "user",      "content": "q1"},
            {"role": "assistant", "content": "a1"},
            {"role": "user",      "content": "q2"},
            {"role": "assistant", "content": "a2"},
        ]
        rounds = _group_into_api_rounds(msgs)
        assert len(rounds) == 2
        assert rounds[0][0]["content"] == "q1"
        assert rounds[1][0]["content"] == "q2"

    def test_single_round(self):
        msgs = [{"role": "user", "content": "q"}, {"role": "assistant", "content": "a"}]
        rounds = _group_into_api_rounds(msgs)
        assert len(rounds) == 1

    def test_system_prefix_forms_own_group(self):
        # A leading system message forms its own group because grouping only splits on
        # user-role messages.  In practice, the system prompt is prepended outside of
        # the messages list that _group_into_api_rounds sees (see _summarize_with_ptl_retry).
        msgs = [
            {"role": "system",    "content": "sys"},
            {"role": "user",      "content": "q1"},
            {"role": "assistant", "content": "a1"},
            {"role": "user",      "content": "q2"},
        ]
        rounds = _group_into_api_rounds(msgs)
        # system = round 0; q1+a1 = round 1; q2 = round 2
        assert len(rounds) == 3
        assert rounds[0][0]["role"] == "system"
        assert rounds[1][0]["content"] == "q1"
        assert rounds[2][0]["content"] == "q2"

    def test_empty_messages(self):
        assert _group_into_api_rounds([]) == []

    def test_trailing_assistant_message(self):
        msgs = [
            {"role": "user",      "content": "q"},
            {"role": "assistant", "content": "a"},
            {"role": "assistant", "content": "follow-up"},
        ]
        rounds = _group_into_api_rounds(msgs)
        assert len(rounds) == 1
        assert len(rounds[0]) == 3


# ---------------------------------------------------------------------------
# _truncate_oldest_round
# ---------------------------------------------------------------------------

class TestTruncateOldestRound:
    def test_drops_first_round_of_two(self):
        msgs = [
            {"role": "user",      "content": "q1"},
            {"role": "assistant", "content": "a1"},
            {"role": "user",      "content": "q2"},
            {"role": "assistant", "content": "a2"},
        ]
        result = _truncate_oldest_round(msgs)
        assert len(result) == 2
        assert result[0]["content"] == "q2"
        assert result[1]["content"] == "a2"

    def test_single_round_unchanged(self):
        msgs = [{"role": "user", "content": "q"}, {"role": "assistant", "content": "a"}]
        result = _truncate_oldest_round(msgs)
        assert result == msgs

    def test_three_rounds_drops_first(self):
        msgs = [
            {"role": "user",      "content": "q1"},
            {"role": "assistant", "content": "a1"},
            {"role": "user",      "content": "q2"},
            {"role": "assistant", "content": "a2"},
            {"role": "user",      "content": "q3"},
            {"role": "assistant", "content": "a3"},
        ]
        result = _truncate_oldest_round(msgs)
        assert len(result) == 4
        assert result[0]["content"] == "q2"

    def test_empty_messages_unchanged(self):
        assert _truncate_oldest_round([]) == []


# ---------------------------------------------------------------------------
# _summarize_with_ptl_retry (unit — mock LLM)
# ---------------------------------------------------------------------------

class TestSummarizeWithPtlRetry:
    def test_success_on_first_attempt(self):
        llm = _make_llm("Summary result")
        result = _summarize_with_ptl_retry(
            [{"role": "user", "content": "hello"}],
            "system prompt",
            llm,
        )
        assert result == "Summary result"
        assert llm.completion.call_count == 1

    def test_system_message_prepended(self):
        llm = _make_llm("ok")
        _summarize_with_ptl_retry(
            [{"role": "user", "content": "q"}],
            "MY_SYSTEM_PROMPT",
            llm,
        )
        call_messages = llm.completion.call_args[1]["messages"]
        assert call_messages[0]["role"] == "system"
        assert call_messages[0]["content"] == "MY_SYSTEM_PROMPT"

    def test_max_tokens_passed(self):
        llm = _make_llm("ok")
        _summarize_with_ptl_retry([], "sys", llm)
        assert llm.completion.call_args[1]["max_tokens"] == COMPACT_MAX_OUTPUT_TOKENS

    def test_ptl_error_triggers_retry(self):
        llm = MagicMock()
        ptl_exc = Exception("context_length_exceeded: input is too long")
        success_resp = MagicMock()
        success_resp.choices[0].message.content = "After retry"
        llm.completion.side_effect = [ptl_exc, success_resp]

        msgs = [
            {"role": "user",      "content": "q1"},
            {"role": "assistant", "content": "a1"},
            {"role": "user",      "content": "q2"},
            {"role": "assistant", "content": "a2"},
        ]
        result = _summarize_with_ptl_retry(msgs, "sys", llm)
        assert result == "After retry"
        assert llm.completion.call_count == 2

    def test_non_ptl_error_propagates_immediately(self):
        llm = MagicMock()
        llm.completion.side_effect = ValueError("authentication error")
        with pytest.raises(ValueError, match="authentication error"):
            _summarize_with_ptl_retry(
                [{"role": "user", "content": "q"}], "sys", llm
            )
        assert llm.completion.call_count == 1

    def test_ptl_exhaustion_raises_runtime_error(self):
        llm = MagicMock()
        llm.completion.side_effect = Exception("context_length: too long")
        with pytest.raises(RuntimeError, match="PTL retry exhausted"):
            msgs = _messages(10)
            _summarize_with_ptl_retry(msgs, "sys", llm)
        assert llm.completion.call_count == MAX_PTL_RETRIES

    def test_none_content_treated_as_empty_string(self):
        llm = MagicMock()
        resp = MagicMock()
        resp.choices[0].message.content = None
        llm.completion.return_value = resp
        result = _summarize_with_ptl_retry([], "sys", llm)
        assert result == ""


# ---------------------------------------------------------------------------
# compact_conversation (integration — mock LLM)
# ---------------------------------------------------------------------------

class TestCompactConversation:
    def test_returns_boundary_and_messages(self):
        llm = _make_llm("My full summary")
        boundary, new_msgs = compact_conversation(
            _messages(2), llm, pre_compact_tokens=10_000
        )
        assert boundary["type"] == "summary"
        assert "My full summary" in boundary["summary"]
        assert len(new_msgs) == 2
        assert new_msgs[0]["role"] == "user"
        assert new_msgs[1]["role"] == "assistant"

    def test_summary_injected_into_user_message(self):
        llm = _make_llm("Important summary text")
        _, new_msgs = compact_conversation(_messages(1), llm, pre_compact_tokens=5_000)
        assert "Important summary text" in new_msgs[0]["content"]

    def test_pre_compact_tokens_stored_in_boundary(self):
        llm = _make_llm("s")
        boundary, _ = compact_conversation([], llm, pre_compact_tokens=87_654)
        assert boundary["pre_compact_tokens"] == 87_654

    def test_custom_instructions_included_in_system_prompt(self):
        llm = _make_llm("s")
        compact_conversation(
            _messages(1), llm, pre_compact_tokens=100,
            custom_instructions="Pay special attention to security findings."
        )
        call_messages = llm.completion.call_args[1]["messages"]
        system_msg = call_messages[0]["content"]
        assert "Pay special attention to security findings." in system_msg

    def test_transcript_path_in_summary_message(self):
        llm = _make_llm("Summary here")
        _, new_msgs = compact_conversation(
            _messages(1), llm, pre_compact_tokens=100,
            transcript_path="/tmp/session.jsonl"
        )
        assert "/tmp/session.jsonl" in new_msgs[0]["content"]

    def test_no_transcript_path_no_file_reference(self):
        llm = _make_llm("s")
        _, new_msgs = compact_conversation(
            _messages(1), llm, pre_compact_tokens=100, transcript_path=None
        )
        assert "read the full transcript" not in new_msgs[0]["content"]

    def test_analysis_block_stripped_from_summary(self):
        llm = _make_llm("<analysis>thinking</analysis>\nReal summary")
        boundary, _ = compact_conversation(_messages(1), llm, pre_compact_tokens=100)
        assert "<analysis>" not in boundary["summary"]
        assert "Real summary" in boundary["summary"]

    def test_ptl_retry_on_context_length_error(self):
        llm = MagicMock()
        ptl_exc = Exception("prompt_too_long: input exceeds context window")
        success = MagicMock()
        success.choices[0].message.content = "Summary after retry"
        llm.completion.side_effect = [ptl_exc, success]

        boundary, _ = compact_conversation(_messages(2), llm, pre_compact_tokens=100)
        assert "Summary after retry" in boundary["summary"]
        assert llm.completion.call_count == 2

    def test_non_ptl_error_propagates(self):
        llm = MagicMock()
        llm.completion.side_effect = ConnectionError("network down")
        with pytest.raises(ConnectionError, match="network down"):
            compact_conversation(_messages(1), llm, pre_compact_tokens=100)

    def test_images_stripped_before_summarization(self):
        llm = _make_llm("s")
        messages_with_image = [
            {"role": "user", "content": [
                {"type": "image", "source": "data:..."},
                {"type": "text", "text": "describe this"},
            ]},
            {"role": "assistant", "content": "a description"},
        ]
        compact_conversation(messages_with_image, llm, pre_compact_tokens=100)
        # Check that no raw image data reached the LLM
        call_messages = llm.completion.call_args[1]["messages"]
        all_content = str(call_messages)
        assert "data:..." not in all_content


# ---------------------------------------------------------------------------
# Prompt constant structural checks
# ---------------------------------------------------------------------------

class TestPromptConstants:
    def test_no_tools_preamble_contains_critical(self):
        assert "CRITICAL" in NO_TOOLS_PREAMBLE

    def test_no_tools_preamble_forbids_tool_use(self):
        assert "tool" in NO_TOOLS_PREAMBLE.lower()

    def test_base_compact_prompt_has_nine_sections(self):
        for i in range(1, 10):
            assert f"{i}." in BASE_COMPACT_PROMPT, f"Section {i} missing from BASE_COMPACT_PROMPT"

    def test_base_compact_prompt_mentions_files(self):
        assert "file" in BASE_COMPACT_PROMPT.lower()

    def test_no_tools_trailer_is_reminder(self):
        assert "REMINDER" in NO_TOOLS_TRAILER

    def test_compact_max_output_tokens_is_20k(self):
        assert COMPACT_MAX_OUTPUT_TOKENS == 20_000

    def test_max_ptl_retries_is_3(self):
        assert MAX_PTL_RETRIES == 3

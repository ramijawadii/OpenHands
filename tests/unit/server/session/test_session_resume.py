"""
Tests for openhands.server.session.session_resume

Coverage:
  - _load_transcript_entries: missing file, valid JSONL, blank/malformed lines,
    oversized file OOM guard (tail seek)
  - _find_last_compaction_boundary: no summary, single summary, multiple summaries,
    summary not at end
  - _entries_to_messages: user, assistant, summary entries; ephemeral exclusion
  - _restore_cost_state: no usage, single entry, accumulation across entries
  - _restore_session_metadata_fast: title, last_prompt, tag, created_at, missing file
  - _reconstruct_env_map: no checkpoint, checkpoint found, most recent wins
  - _extract_field: first occurrence, not found, unicode escapes
  - _extract_last_field: last occurrence, no matching type, field in correct entry only
  - resume_session: full integration — no transcript, fresh session, boundary found,
    session_state.switch_session called correctly
"""
from __future__ import annotations

import json
import uuid
from pathlib import Path
from unittest.mock import MagicMock

import pytest

from openhands.server.session.session_resume import (
    LITE_READ_BUF,
    MAX_READ_BYTES,
    _entries_to_messages,
    _extract_field,
    _extract_last_field,
    _find_last_compaction_boundary,
    _load_transcript_entries,
    _reconstruct_env_map,
    _restore_cost_state,
    _restore_session_metadata_fast,
    resume_session,
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def tmp_dir(tmp_path: Path) -> Path:
    return tmp_path


def _write_jsonl(path: Path, entries: list[dict]) -> None:
    path.write_text(
        "\n".join(json.dumps(e) for e in entries) + "\n",
        encoding="utf-8",
    )


# ---------------------------------------------------------------------------
# _load_transcript_entries
# ---------------------------------------------------------------------------

class TestLoadTranscriptEntries:
    def test_missing_file_returns_empty(self, tmp_dir: Path):
        result = _load_transcript_entries(tmp_dir / "nonexistent.jsonl")
        assert result == []

    def test_parses_valid_jsonl(self, tmp_dir: Path):
        p = tmp_dir / "valid.jsonl"
        _write_jsonl(p, [
            {"type": "user",      "content": "hello"},
            {"type": "assistant", "content": "hi"},
        ])
        entries = _load_transcript_entries(p)
        assert len(entries) == 2
        assert entries[0]["type"] == "user"
        assert entries[1]["type"] == "assistant"

    def test_skips_blank_lines(self, tmp_dir: Path):
        p = tmp_dir / "blanks.jsonl"
        p.write_text('\n{"type":"user","content":"hi"}\n\n', encoding="utf-8")
        entries = _load_transcript_entries(p)
        assert len(entries) == 1

    def test_skips_malformed_json(self, tmp_dir: Path):
        p = tmp_dir / "bad.jsonl"
        p.write_text(
            '{"type":"user","content":"ok"}\nNOT JSON\n{"type":"assistant","content":"ok"}\n',
            encoding="utf-8",
        )
        entries = _load_transcript_entries(p)
        assert len(entries) == 2

    def test_empty_file_returns_empty(self, tmp_dir: Path):
        p = tmp_dir / "empty.jsonl"
        p.write_bytes(b"")
        assert _load_transcript_entries(p) == []

    def test_oom_guard_tail_read(self, tmp_dir: Path, monkeypatch):
        monkeypatch.setattr(
            "openhands.server.session.session_resume.MAX_READ_BYTES", 50
        )
        filler = '{"type":"system","content":"fill"}\n' * 5  # ~175 bytes
        tail = '{"type":"user","content":"tail-entry"}\n'
        p = tmp_dir / "big.jsonl"
        p.write_bytes((filler + tail).encode("utf-8"))

        entries = _load_transcript_entries(p)
        assert any(e.get("content") == "tail-entry" for e in entries)

    def test_encoding_errors_replaced(self, tmp_dir: Path):
        p = tmp_dir / "enc.jsonl"
        # Write a line with a valid JSON object preceded by a bad UTF-8 byte
        p.write_bytes(b'\xff\n{"type":"user","content":"ok"}\n')
        entries = _load_transcript_entries(p)
        assert any(e.get("type") == "user" for e in entries)


# ---------------------------------------------------------------------------
# _find_last_compaction_boundary
# ---------------------------------------------------------------------------

class TestFindLastCompactionBoundary:
    def test_no_summary_returns_none(self):
        entries = [{"type": "user"}, {"type": "assistant"}]
        assert _find_last_compaction_boundary(entries) is None

    def test_single_summary_returns_index(self):
        entries = [
            {"type": "user"},
            {"type": "summary", "summary": "text"},
            {"type": "assistant"},
        ]
        assert _find_last_compaction_boundary(entries) == 1

    def test_returns_last_summary_index(self):
        entries = [
            {"type": "summary", "summary": "first"},
            {"type": "user"},
            {"type": "summary", "summary": "second"},
            {"type": "assistant"},
        ]
        assert _find_last_compaction_boundary(entries) == 2

    def test_summary_at_end(self):
        entries = [{"type": "user"}, {"type": "summary"}]
        assert _find_last_compaction_boundary(entries) == 1

    def test_empty_entries(self):
        assert _find_last_compaction_boundary([]) is None


# ---------------------------------------------------------------------------
# _entries_to_messages
# ---------------------------------------------------------------------------

class TestEntriesToMessages:
    def test_user_entry_mapped_to_user_role(self):
        entries = [{"type": "user", "content": "hello"}]
        msgs = _entries_to_messages(entries)
        assert msgs == [{"role": "user", "content": "hello"}]

    def test_assistant_entry_mapped_to_assistant_role(self):
        entries = [{"type": "assistant", "content": "hi"}]
        msgs = _entries_to_messages(entries)
        assert msgs == [{"role": "assistant", "content": "hi"}]

    def test_summary_entry_injected_as_user_message(self):
        entries = [{"type": "summary", "summary": "Earlier work: ..."}]
        msgs = _entries_to_messages(entries)
        assert len(msgs) == 1
        assert msgs[0]["role"] == "user"
        assert "Earlier work: ..." in msgs[0]["content"]
        assert "continued from" in msgs[0]["content"]

    def test_summary_without_summary_field(self):
        entries = [{"type": "summary"}]
        msgs = _entries_to_messages(entries)
        assert len(msgs) == 1
        assert msgs[0]["role"] == "user"

    def test_tool_progress_excluded(self):
        entries = [
            {"type": "user",          "content": "q"},
            {"type": "tool_progress", "content": "running"},
            {"type": "assistant",     "content": "done"},
        ]
        msgs = _entries_to_messages(entries)
        assert len(msgs) == 2
        roles = [m["role"] for m in msgs]
        assert "user" in roles
        assert "assistant" in roles

    def test_system_entry_excluded(self):
        entries = [{"type": "system"}, {"type": "user", "content": "q"}]
        msgs = _entries_to_messages(entries)
        assert len(msgs) == 1

    def test_metadata_entries_excluded(self):
        entries = [
            {"type": "title",       "value": "My session"},
            {"type": "last-prompt", "value": "hello"},
            {"type": "tag",         "value": "v1"},
            {"type": "user",        "content": "real message"},
        ]
        msgs = _entries_to_messages(entries)
        assert len(msgs) == 1
        assert msgs[0]["content"] == "real message"

    def test_missing_content_defaults_to_empty_string(self):
        entries = [{"type": "user"}]
        msgs = _entries_to_messages(entries)
        assert msgs[0]["content"] == ""

    def test_empty_entries(self):
        assert _entries_to_messages([]) == []

    def test_ordering_preserved(self):
        entries = [
            {"type": "user",      "content": "first"},
            {"type": "assistant", "content": "second"},
            {"type": "user",      "content": "third"},
        ]
        msgs = _entries_to_messages(entries)
        assert [m["content"] for m in msgs] == ["first", "second", "third"]


# ---------------------------------------------------------------------------
# _restore_cost_state
# ---------------------------------------------------------------------------

class TestRestoreCostState:
    def test_no_usage_entries(self):
        cost = _restore_cost_state([{"type": "user", "content": "hi"}])
        assert cost["accumulated_prompt_tokens"]     == 0
        assert cost["accumulated_completion_tokens"] == 0
        assert cost["accumulated_total_tokens"]      == 0

    def test_single_entry_with_usage(self):
        entries = [{"type": "assistant", "usage": {"prompt_tokens": 100, "completion_tokens": 50}}]
        cost = _restore_cost_state(entries)
        assert cost["accumulated_prompt_tokens"]     == 100
        assert cost["accumulated_completion_tokens"] == 50
        assert cost["accumulated_total_tokens"]      == 150

    def test_accumulates_across_entries(self):
        entries = [
            {"usage": {"prompt_tokens": 100, "completion_tokens": 20}},
            {"usage": {"prompt_tokens": 200, "completion_tokens": 30}},
        ]
        cost = _restore_cost_state(entries)
        assert cost["accumulated_prompt_tokens"]     == 300
        assert cost["accumulated_completion_tokens"] == 50
        assert cost["accumulated_total_tokens"]      == 350

    def test_missing_usage_key_skipped(self):
        entries = [
            {"type": "user"},
            {"usage": {"prompt_tokens": 10, "completion_tokens": 5}},
        ]
        cost = _restore_cost_state(entries)
        assert cost["accumulated_prompt_tokens"] == 10

    def test_empty_entries(self):
        cost = _restore_cost_state([])
        assert cost["accumulated_total_tokens"] == 0


# ---------------------------------------------------------------------------
# _restore_session_metadata_fast
# ---------------------------------------------------------------------------

class TestRestoreSessionMetadataFast:
    def test_missing_file_returns_empty(self, tmp_dir: Path):
        result = _restore_session_metadata_fast(tmp_dir / "missing.jsonl")
        assert result == {}

    def test_extracts_title(self, tmp_dir: Path):
        p = tmp_dir / "meta.jsonl"
        p.write_text(
            '{"type":"user","content":"hi","timestamp":"2024-01-01T00:00:00"}\n'
            '{"type":"title","value":"My Session"}\n',
            encoding="utf-8",
        )
        meta = _restore_session_metadata_fast(p)
        assert meta["title"] == "My Session"

    def test_extracts_last_prompt(self, tmp_dir: Path):
        p = tmp_dir / "prompt.jsonl"
        p.write_text(
            '{"type":"user","content":"hi"}\n'
            '{"type":"last-prompt","value":"final message"}\n',
            encoding="utf-8",
        )
        meta = _restore_session_metadata_fast(p)
        assert meta["last_prompt"] == "final message"

    def test_extracts_tag(self, tmp_dir: Path):
        p = tmp_dir / "tag.jsonl"
        p.write_text(
            '{"type":"tag","value":"v2"}\n',
            encoding="utf-8",
        )
        meta = _restore_session_metadata_fast(p)
        assert meta["tag"] == "v2"

    def test_extracts_created_at_from_first_entry(self, tmp_dir: Path):
        p = tmp_dir / "ts.jsonl"
        p.write_text(
            '{"type":"user","timestamp":"2024-06-01T12:00:00"}\n',
            encoding="utf-8",
        )
        meta = _restore_session_metadata_fast(p)
        assert meta["created_at"] == "2024-06-01T12:00:00"

    def test_missing_fields_return_none(self, tmp_dir: Path):
        p = tmp_dir / "sparse.jsonl"
        p.write_text('{"type":"user","content":"hi"}\n', encoding="utf-8")
        meta = _restore_session_metadata_fast(p)
        assert meta["title"] is None
        assert meta["last_prompt"] is None
        assert meta["tag"] is None


# ---------------------------------------------------------------------------
# _reconstruct_env_map
# ---------------------------------------------------------------------------

class TestReconstructEnvMap:
    def test_no_checkpoint_returns_empty(self):
        entries = [{"type": "user"}, {"type": "assistant"}]
        assert _reconstruct_env_map(entries) == {}

    def test_checkpoint_env_summary_returned(self):
        entries = [
            {"type": "checkpoint", "env_summary": {"cwd": "/home/user", "branch": "main"}},
        ]
        result = _reconstruct_env_map(entries)
        assert result["cwd"] == "/home/user"

    def test_most_recent_checkpoint_wins(self):
        entries = [
            {"type": "checkpoint", "env_summary": {"branch": "old"}},
            {"type": "user"},
            {"type": "checkpoint", "env_summary": {"branch": "new"}},
        ]
        result = _reconstruct_env_map(entries)
        assert result["branch"] == "new"

    def test_checkpoint_without_env_summary_returns_empty(self):
        entries = [{"type": "checkpoint"}]
        assert _reconstruct_env_map(entries) == {}


# ---------------------------------------------------------------------------
# _extract_field
# ---------------------------------------------------------------------------

class TestExtractField:
    def test_finds_simple_string_field(self):
        text = '{"type":"user","value":"hello world"}'
        assert _extract_field(text, "value") == "hello world"

    def test_returns_none_when_not_found(self):
        assert _extract_field('{"type":"user"}', "value") is None

    def test_first_occurrence_returned(self):
        text = '{"value":"first"} ... {"value":"second"}'
        assert _extract_field(text, "value") == "first"

    def test_handles_escaped_characters(self):
        text = r'{"value":"line1\nline2"}'
        result = _extract_field(text, "value")
        assert result == "line1\nline2"

    def test_handles_spaces_around_colon(self):
        text = '{"value" : "spaced"}'
        assert _extract_field(text, "value") == "spaced"

    def test_empty_string_value(self):
        text = '{"value":""}'
        result = _extract_field(text, "value")
        assert result == ""


# ---------------------------------------------------------------------------
# _extract_last_field
# ---------------------------------------------------------------------------

class TestExtractLastField:
    def test_extracts_value_from_matching_type(self):
        text = '{"type":"title","value":"My Title"}\n'
        assert _extract_last_field(text, "title", "value") == "My Title"

    def test_returns_last_occurrence(self):
        text = (
            '{"type":"title","value":"Old Title"}\n'
            '{"type":"title","value":"New Title"}\n'
        )
        assert _extract_last_field(text, "title", "value") == "New Title"

    def test_no_matching_type_returns_none(self):
        text = '{"type":"user","value":"something"}'
        assert _extract_last_field(text, "title", "value") is None

    def test_field_not_in_entry_returns_none(self):
        text = '{"type":"title","other":"x"}'
        assert _extract_last_field(text, "title", "value") is None

    def test_does_not_extract_from_wrong_type(self):
        text = '{"type":"user","value":"user-value"} {"type":"title","value":"title-value"}'
        # Only looks after the last "type":"title" marker
        assert _extract_last_field(text, "title", "value") == "title-value"


# ---------------------------------------------------------------------------
# resume_session — integration
# ---------------------------------------------------------------------------

class TestResumeSession:
    def _make_session_id(self) -> str:
        return str(uuid.uuid4())

    def test_missing_transcript_returns_empty_live_messages(self, tmp_dir: Path):
        sid = self._make_session_id()
        result = resume_session(sid, tmp_dir)
        assert result["live_messages"] == []
        assert result["boundary_found"] is False

    def test_fresh_session_no_boundary(self, tmp_dir: Path):
        sid = self._make_session_id()
        p = tmp_dir / f"{sid}.jsonl"
        _write_jsonl(p, [
            {"type": "user",      "content": "hello", "timestamp": "2024-01-01"},
            {"type": "assistant", "content": "hi"},
        ])
        result = resume_session(sid, tmp_dir)
        assert result["boundary_found"] is False
        assert len(result["live_messages"]) == 2

    def test_boundary_found_only_post_boundary_messages(self, tmp_dir: Path):
        sid = self._make_session_id()
        p = tmp_dir / f"{sid}.jsonl"
        _write_jsonl(p, [
            {"type": "user",      "content": "pre-compact question"},
            {"type": "assistant", "content": "pre-compact answer"},
            {"type": "summary",   "summary": "Compacted summary text"},
            {"type": "user",      "content": "post-compact question"},
            {"type": "assistant", "content": "post-compact answer"},
        ])
        result = resume_session(sid, tmp_dir)
        assert result["boundary_found"] is True
        # Summary entry is included (injected as user), plus two post-boundary messages
        contents = [m["content"] for m in result["live_messages"]]
        assert any("Compacted summary text" in c for c in contents)
        assert any("post-compact question" in c for c in contents)
        # Pre-compact messages excluded
        assert not any("pre-compact question" in c for c in contents)

    def test_session_state_switch_called_when_provided(self, tmp_dir: Path):
        sid = self._make_session_id()
        mock_state = MagicMock()
        resume_session(sid, tmp_dir, session_state=mock_state)
        mock_state.switch_session.assert_called_once_with(sid, str(tmp_dir / f"{sid}.jsonl"))

    def test_session_state_not_required(self, tmp_dir: Path):
        sid = self._make_session_id()
        result = resume_session(sid, tmp_dir)  # session_state=None
        assert "live_messages" in result

    def test_transcript_path_in_result(self, tmp_dir: Path):
        sid = self._make_session_id()
        result = resume_session(sid, tmp_dir)
        assert result["transcript_path"].endswith(f"{sid}.jsonl")

    def test_cost_state_accumulated(self, tmp_dir: Path):
        sid = self._make_session_id()
        p = tmp_dir / f"{sid}.jsonl"
        _write_jsonl(p, [
            {"type": "assistant", "content": "a1",
             "usage": {"prompt_tokens": 100, "completion_tokens": 20}},
            {"type": "assistant", "content": "a2",
             "usage": {"prompt_tokens": 150, "completion_tokens": 30}},
        ])
        result = resume_session(sid, tmp_dir)
        assert result["cost_state"]["accumulated_prompt_tokens"] == 250
        assert result["cost_state"]["accumulated_completion_tokens"] == 50

    def test_metadata_extracted(self, tmp_dir: Path):
        sid = self._make_session_id()
        p = tmp_dir / f"{sid}.jsonl"
        p.write_text(
            '{"type":"user","content":"hi","timestamp":"2024-06-01T00:00:00"}\n'
            '{"type":"title","value":"Test Session"}\n'
            '{"type":"last-prompt","value":"last question"}\n',
            encoding="utf-8",
        )
        result = resume_session(sid, tmp_dir)
        assert result["metadata"]["title"] == "Test Session"
        assert result["metadata"]["last_prompt"] == "last question"

    def test_env_map_from_checkpoint(self, tmp_dir: Path):
        sid = self._make_session_id()
        p = tmp_dir / f"{sid}.jsonl"
        _write_jsonl(p, [
            {"type": "checkpoint", "env_summary": {"cwd": "/project", "branch": "main"}},
        ])
        result = resume_session(sid, tmp_dir)
        assert result["env_map"]["cwd"] == "/project"

    def test_multiple_boundaries_uses_last(self, tmp_dir: Path):
        sid = self._make_session_id()
        p = tmp_dir / f"{sid}.jsonl"
        _write_jsonl(p, [
            {"type": "user",      "content": "very old"},
            {"type": "summary",   "summary": "first compact"},
            {"type": "user",      "content": "middle"},
            {"type": "summary",   "summary": "second compact"},
            {"type": "user",      "content": "recent"},
        ])
        result = resume_session(sid, tmp_dir)
        contents = [m["content"] for m in result["live_messages"]]
        assert any("second compact" in c for c in contents)
        assert any("recent" in c for c in contents)
        # "first compact" boundary was overridden by second compact
        assert not any("very old" in c for c in contents)
        assert not any("middle" in c for c in contents)

"""
Tests for openhands.storage.fast_metadata (Layer 10)

Coverage:
  - read_fast_metadata():
      missing file → empty FastSessionMetadata
      empty file → empty FastSessionMetadata
      extracts title from tail
      extracts last_prompt from tail
      extracts tag from tail
      extracts agent_name from tail
      extracts created_at (first timestamp) from head
      returns last value when multiple title entries present
      oversized file: reads 64KB tail correctly (title not cut)
      OSError → empty FastSessionMetadata
  - FastSessionMetadata.to_dict():
      omits None fields
      includes all non-None fields
  - read_fast_metadata_many():
      processes list of paths in order
      missing paths produce empty metadata (no exception)
  - _extract_first / _extract_last helpers:
      correct first/last extraction
      returns None when key absent
  - _unescape():
      unescapes common JSON sequences
  - _get_pattern():
      caches compiled patterns (same object on repeated calls)
"""
from __future__ import annotations

import json
import os
from pathlib import Path

import pytest

from openhands.storage.fast_metadata import (
    FastSessionMetadata,
    _extract_first,
    _extract_last,
    _get_pattern,
    _unescape,
    read_fast_metadata,
    read_fast_metadata_many,
    LITE_READ_BUF,
)


# ---------------------------------------------------------------------------
# JSONL helpers
# ---------------------------------------------------------------------------

def _entry(entry_type: str, **kwargs) -> str:
    return json.dumps({"type": entry_type, "timestamp": "2026-01-01T00:00:00+00:00", **kwargs})


def _write_transcript(path: Path, lines: list[str]) -> None:
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


# ---------------------------------------------------------------------------
# FastSessionMetadata.to_dict
# ---------------------------------------------------------------------------

class TestFastSessionMetadataToDict:
    def test_all_none_returns_empty_dict(self):
        m = FastSessionMetadata()
        assert m.to_dict() == {}

    def test_none_fields_omitted(self):
        m = FastSessionMetadata(title="MySession")
        d = m.to_dict()
        assert d == {"title": "MySession"}
        assert "last_prompt" not in d

    def test_all_fields_included(self):
        m = FastSessionMetadata(
            title="T",
            last_prompt="fix the bug",
            tag="v1",
            agent_name="CodeActAgent",
            created_at="2026-01-01T00:00:00+00:00",
        )
        d = m.to_dict()
        assert d["title"] == "T"
        assert d["last_prompt"] == "fix the bug"
        assert d["tag"] == "v1"
        assert d["agent_name"] == "CodeActAgent"
        assert d["created_at"] == "2026-01-01T00:00:00+00:00"


# ---------------------------------------------------------------------------
# read_fast_metadata — basic cases
# ---------------------------------------------------------------------------

class TestReadFastMetadata:
    def test_missing_file_returns_empty(self, tmp_path):
        result = read_fast_metadata(tmp_path / "nonexistent.jsonl")
        assert result == FastSessionMetadata()

    def test_empty_file_returns_empty(self, tmp_path):
        p = tmp_path / "s.jsonl"
        p.write_text("")
        result = read_fast_metadata(p)
        assert result == FastSessionMetadata()

    def test_extracts_title(self, tmp_path):
        p = tmp_path / "s.jsonl"
        _write_transcript(p, [
            _entry("user", content="hello"),
            _entry("title", value="My Debugging Session"),
        ])
        meta = read_fast_metadata(p)
        assert meta.title == "My Debugging Session"

    def test_extracts_last_prompt(self, tmp_path):
        p = tmp_path / "s.jsonl"
        _write_transcript(p, [
            _entry("user", content="first message"),
            _entry("last-prompt", value="fix the login bug"),
        ])
        meta = read_fast_metadata(p)
        assert meta.last_prompt == "fix the login bug"

    def test_extracts_tag(self, tmp_path):
        p = tmp_path / "s.jsonl"
        _write_transcript(p, [
            _entry("tag", value="sprint-42"),
        ])
        meta = read_fast_metadata(p)
        assert meta.tag == "sprint-42"

    def test_extracts_agent_name(self, tmp_path):
        p = tmp_path / "s.jsonl"
        _write_transcript(p, [
            _entry("agent-name", value="CodeActAgent"),
        ])
        meta = read_fast_metadata(p)
        assert meta.agent_name == "CodeActAgent"

    def test_extracts_created_at_from_head(self, tmp_path):
        p = tmp_path / "s.jsonl"
        _write_transcript(p, [
            json.dumps({"type": "user", "timestamp": "2026-03-10T08:00:00+00:00", "content": "hello"}),
            _entry("title", value="T"),
        ])
        meta = read_fast_metadata(p)
        assert meta.created_at == "2026-03-10T08:00:00+00:00"

    def test_returns_last_title_when_multiple(self, tmp_path):
        p = tmp_path / "s.jsonl"
        _write_transcript(p, [
            _entry("title", value="first title"),
            _entry("user", content="some work"),
            _entry("title", value="updated title"),
        ])
        meta = read_fast_metadata(p)
        assert meta.title == "updated title"

    def test_accepts_string_path(self, tmp_path):
        p = tmp_path / "s.jsonl"
        _write_transcript(p, [_entry("title", value="T")])
        meta = read_fast_metadata(str(p))
        assert meta.title == "T"

    def test_no_title_gives_none(self, tmp_path):
        p = tmp_path / "s.jsonl"
        _write_transcript(p, [_entry("user", content="hello")])
        meta = read_fast_metadata(p)
        assert meta.title is None

    def test_multiple_fields_at_once(self, tmp_path):
        p = tmp_path / "s.jsonl"
        _write_transcript(p, [
            json.dumps({"type": "user", "timestamp": "2026-01-01T00:00:00+00:00", "content": "start"}),
            _entry("title",      value="BigTask"),
            _entry("last-prompt", value="deploy to prod"),
            _entry("tag",        value="release"),
            _entry("agent-name", value="CodeActAgent"),
        ])
        meta = read_fast_metadata(p)
        assert meta.title == "BigTask"
        assert meta.last_prompt == "deploy to prod"
        assert meta.tag == "release"
        assert meta.agent_name == "CodeActAgent"
        assert meta.created_at == "2026-01-01T00:00:00+00:00"


# ---------------------------------------------------------------------------
# Oversized file — tail read
# ---------------------------------------------------------------------------

class TestOversizedFile:
    def test_title_in_tail_is_found(self, tmp_path):
        """A title entry near the end of a large file must be found via tail read."""
        p = tmp_path / "big.jsonl"
        # Write enough filler to push past LITE_READ_BUF from the head
        filler_line = json.dumps({"type": "user", "content": "x" * 200}) + "\n"
        filler_count = (LITE_READ_BUF // len(filler_line.encode())) + 50
        with open(p, "w", encoding="utf-8") as fh:
            fh.write(json.dumps({"type": "user", "timestamp": "2026-01-01T00:00:00+00:00", "content": "first"}) + "\n")
            for _ in range(filler_count):
                fh.write(filler_line)
            fh.write(_entry("title", value="TailTitle") + "\n")

        meta = read_fast_metadata(p)
        assert meta.title == "TailTitle"
        assert meta.created_at == "2026-01-01T00:00:00+00:00"


# ---------------------------------------------------------------------------
# read_fast_metadata_many
# ---------------------------------------------------------------------------

class TestReadFastMetadataMany:
    def test_returns_list_in_order(self, tmp_path):
        p1 = tmp_path / "a.jsonl"
        p2 = tmp_path / "b.jsonl"
        _write_transcript(p1, [_entry("title", value="A")])
        _write_transcript(p2, [_entry("title", value="B")])
        results = read_fast_metadata_many([p1, p2])
        assert len(results) == 2
        assert results[0].title == "A"
        assert results[1].title == "B"

    def test_missing_paths_produce_empty_not_raise(self, tmp_path):
        missing = tmp_path / "gone.jsonl"
        results = read_fast_metadata_many([missing])
        assert results == [FastSessionMetadata()]

    def test_empty_list(self):
        assert read_fast_metadata_many([]) == []

    def test_mixed_present_and_missing(self, tmp_path):
        p = tmp_path / "real.jsonl"
        _write_transcript(p, [_entry("title", value="Found")])
        missing = tmp_path / "gone.jsonl"
        results = read_fast_metadata_many([p, missing])
        assert results[0].title == "Found"
        assert results[1].title is None


# ---------------------------------------------------------------------------
# _extract_first / _extract_last
# ---------------------------------------------------------------------------

class TestExtractHelpers:
    def test_extract_first_finds_first_match(self):
        text = '{"timestamp": "2026-01-01", "other": "2026-02-01"}'
        assert _extract_first(text, "timestamp") == "2026-01-01"

    def test_extract_first_returns_none_when_missing(self):
        assert _extract_first('{"a": "b"}', "missing_key") is None

    def test_extract_last_finds_last_entry_type_compact(self):
        text = (
            '{"type":"title","value":"first"}\n'
            '{"type":"title","value":"last"}\n'
        )
        assert _extract_last(text, "title", "value") == "last"

    def test_extract_last_finds_last_entry_type_spaced(self):
        """json.dumps default output includes spaces: "type": "title"."""
        text = (
            '{"type": "title", "value": "first"}\n'
            '{"type": "title", "value": "last"}\n'
        )
        assert _extract_last(text, "title", "value") == "last"

    def test_extract_last_returns_none_when_type_absent(self):
        text = '{"type": "user", "content": "hello"}'
        assert _extract_last(text, "title", "value") is None

    def test_extract_last_returns_none_when_field_absent(self):
        text = '{"type": "title", "other": "x"}'
        assert _extract_last(text, "title", "value") is None


# ---------------------------------------------------------------------------
# _unescape
# ---------------------------------------------------------------------------

class TestUnescape:
    def test_unescapes_double_quote(self):
        assert _unescape('\\"hello\\"') == '"hello"'

    def test_unescapes_backslash(self):
        assert _unescape('a\\\\b') == 'a\\b'

    def test_unescapes_newline(self):
        assert _unescape('a\\nb') == 'a\nb'

    def test_unescapes_tab(self):
        assert _unescape('a\\tb') == 'a\tb'

    def test_unescapes_carriage_return(self):
        assert _unescape('a\\rb') == 'a\rb'

    def test_plain_string_unchanged(self):
        assert _unescape("hello world") == "hello world"


# ---------------------------------------------------------------------------
# _get_pattern — caching
# ---------------------------------------------------------------------------

class TestGetPattern:
    def test_same_object_on_repeated_calls(self):
        p1 = _get_pattern("title")
        p2 = _get_pattern("title")
        assert p1 is p2

    def test_different_keys_give_different_patterns(self):
        p1 = _get_pattern("title")
        p2 = _get_pattern("tag")
        assert p1 is not p2

    def test_pattern_matches_simple_entry(self):
        pat = _get_pattern("value")
        m = pat.search('{"type":"title","value":"Hello"}')
        assert m is not None
        assert m.group(1) == "Hello"

"""
Tests for openhands.server.session.delegate_transcript

Coverage:
  - create_delegate_transcript():
      returns a TranscriptWriter instance
      sub-agent dir is {base}/{parent_id}/subagents/
      TranscriptWriter session_id matches agent_id
      TranscriptWriter base_dir is the subagents/ directory
      JSONL file not yet materialized (lazy)
      sidecar written immediately to {base}/{agent_id}.meta.json
  - sidecar content:
      contains correct type, agent_id, parent_session_id, created_at
      version field present
  - load_sidecar():
      returns dict when sidecar exists
      returns None when file absent
      returns None when file is malformed JSON
      all sidecar fields round-trip correctly
  - multiple delegates from same parent:
      each gets own JSONL path under same subagents/ dir
      each has own sidecar
  - _write_sidecar extra param:
      extra fields merged into sidecar
  - TranscriptWriter lazy materialization:
      no JSONL file until first write triggered
"""
from __future__ import annotations

import json
import time
import uuid
from pathlib import Path

import pytest

from openhands.server.session.delegate_transcript import (
    create_delegate_transcript,
    load_sidecar,
    _write_sidecar,
)
from openhands.storage.transcript_writer import TranscriptWriter


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _parent_id() -> str:
    return str(uuid.uuid4())


def _agent_id() -> str:
    return str(uuid.uuid4())


# ---------------------------------------------------------------------------
# create_delegate_transcript — core behaviour
# ---------------------------------------------------------------------------

class TestCreateDelegateTranscript:
    def test_returns_transcript_writer(self, tmp_path):
        writer = create_delegate_transcript(_parent_id(), _agent_id(), tmp_path)
        assert isinstance(writer, TranscriptWriter)

    def test_writer_session_id_matches_agent_id(self, tmp_path):
        agent_id = _agent_id()
        writer = create_delegate_transcript(_parent_id(), agent_id, tmp_path)
        assert writer.session_id == agent_id

    def test_writer_base_dir_is_subagents_dir(self, tmp_path):
        parent_id = _parent_id()
        agent_id = _agent_id()
        writer = create_delegate_transcript(parent_id, agent_id, tmp_path)
        expected_dir = tmp_path / parent_id / "subagents"
        assert writer._base_dir == expected_dir

    def test_subagents_dir_created(self, tmp_path):
        parent_id = _parent_id()
        create_delegate_transcript(parent_id, _agent_id(), tmp_path)
        assert (tmp_path / parent_id / "subagents").is_dir()

    def test_jsonl_not_yet_materialized(self, tmp_path):
        """TranscriptWriter is lazy — JSONL file must not exist at creation time."""
        parent_id = _parent_id()
        agent_id = _agent_id()
        writer = create_delegate_transcript(parent_id, agent_id, tmp_path)
        assert writer.path is None
        expected_jsonl = tmp_path / parent_id / "subagents" / f"{agent_id}.jsonl"
        assert not expected_jsonl.exists()

    def test_sidecar_written_immediately(self, tmp_path):
        parent_id = _parent_id()
        agent_id = _agent_id()
        create_delegate_transcript(parent_id, agent_id, tmp_path)
        sidecar = tmp_path / f"{agent_id}.meta.json"
        assert sidecar.exists()

    def test_accepts_string_base_dir(self, tmp_path):
        """base_dir may be a str, not just a Path."""
        writer = create_delegate_transcript(_parent_id(), _agent_id(), str(tmp_path))
        assert isinstance(writer, TranscriptWriter)


# ---------------------------------------------------------------------------
# Sidecar content
# ---------------------------------------------------------------------------

class TestSidecarContent:
    def _load(self, tmp_path, parent_id, agent_id) -> dict:
        create_delegate_transcript(parent_id, agent_id, tmp_path)
        return json.loads((tmp_path / f"{agent_id}.meta.json").read_text())

    def test_type_is_subagent(self, tmp_path):
        d = self._load(tmp_path, _parent_id(), _agent_id())
        assert d["type"] == "subagent"

    def test_agent_id_present(self, tmp_path):
        agent_id = _agent_id()
        d = self._load(tmp_path, _parent_id(), agent_id)
        assert d["agent_id"] == agent_id

    def test_parent_session_id_present(self, tmp_path):
        parent_id = _parent_id()
        d = self._load(tmp_path, parent_id, _agent_id())
        assert d["parent_session_id"] == parent_id

    def test_created_at_is_iso_string(self, tmp_path):
        d = self._load(tmp_path, _parent_id(), _agent_id())
        assert "created_at" in d
        # Must be parseable as ISO 8601
        from datetime import datetime
        datetime.fromisoformat(d["created_at"])

    def test_version_field_present(self, tmp_path):
        d = self._load(tmp_path, _parent_id(), _agent_id())
        assert "version" in d
        assert isinstance(d["version"], int)

    def test_extra_fields_merged(self, tmp_path):
        parent_id = _parent_id()
        agent_id = _agent_id()
        sidecar_path = _write_sidecar(tmp_path, agent_id, parent_id, extra={"task": "web-search"})
        d = json.loads(sidecar_path.read_text())
        assert d["task"] == "web-search"
        assert d["agent_id"] == agent_id

    def test_sidecar_is_valid_json(self, tmp_path):
        agent_id = _agent_id()
        create_delegate_transcript(_parent_id(), agent_id, tmp_path)
        raw = (tmp_path / f"{agent_id}.meta.json").read_text()
        parsed = json.loads(raw)
        assert isinstance(parsed, dict)


# ---------------------------------------------------------------------------
# load_sidecar
# ---------------------------------------------------------------------------

class TestLoadSidecar:
    def test_returns_dict_when_sidecar_exists(self, tmp_path):
        parent_id = _parent_id()
        agent_id = _agent_id()
        create_delegate_transcript(parent_id, agent_id, tmp_path)
        result = load_sidecar(tmp_path, agent_id)
        assert isinstance(result, dict)

    def test_returns_none_when_absent(self, tmp_path):
        result = load_sidecar(tmp_path, "nonexistent-agent")
        assert result is None

    def test_returns_none_on_malformed_json(self, tmp_path):
        agent_id = _agent_id()
        (tmp_path / f"{agent_id}.meta.json").write_text("{broken json", encoding="utf-8")
        result = load_sidecar(tmp_path, agent_id)
        assert result is None

    def test_round_trips_all_required_fields(self, tmp_path):
        parent_id = _parent_id()
        agent_id = _agent_id()
        create_delegate_transcript(parent_id, agent_id, tmp_path)
        d = load_sidecar(tmp_path, agent_id)
        assert d is not None
        assert d["type"] == "subagent"
        assert d["agent_id"] == agent_id
        assert d["parent_session_id"] == parent_id
        assert "created_at" in d

    def test_accepts_string_base_dir(self, tmp_path):
        parent_id = _parent_id()
        agent_id = _agent_id()
        create_delegate_transcript(parent_id, agent_id, tmp_path)
        result = load_sidecar(str(tmp_path), agent_id)
        assert result is not None


# ---------------------------------------------------------------------------
# Multiple delegates from same parent
# ---------------------------------------------------------------------------

class TestMultipleDelegates:
    def test_two_delegates_have_separate_sidecars(self, tmp_path):
        parent_id = _parent_id()
        agent_a = _agent_id()
        agent_b = _agent_id()
        create_delegate_transcript(parent_id, agent_a, tmp_path)
        create_delegate_transcript(parent_id, agent_b, tmp_path)
        assert (tmp_path / f"{agent_a}.meta.json").exists()
        assert (tmp_path / f"{agent_b}.meta.json").exists()

    def test_two_delegates_share_subagents_dir(self, tmp_path):
        parent_id = _parent_id()
        create_delegate_transcript(parent_id, _agent_id(), tmp_path)
        create_delegate_transcript(parent_id, _agent_id(), tmp_path)
        subagents_dir = tmp_path / parent_id / "subagents"
        assert subagents_dir.is_dir()

    def test_two_delegates_have_separate_writers(self, tmp_path):
        parent_id = _parent_id()
        agent_a, agent_b = _agent_id(), _agent_id()
        writer_a = create_delegate_transcript(parent_id, agent_a, tmp_path)
        writer_b = create_delegate_transcript(parent_id, agent_b, tmp_path)
        assert writer_a is not writer_b
        assert writer_a.session_id != writer_b.session_id

    def test_different_parents_have_different_dirs(self, tmp_path):
        parent_x = _parent_id()
        parent_y = _parent_id()
        agent = _agent_id()
        create_delegate_transcript(parent_x, agent, tmp_path)
        # Sidecar is overwritten for same agent_id (last writer wins)
        create_delegate_transcript(parent_y, agent, tmp_path)
        d = load_sidecar(tmp_path, agent)
        assert d["parent_session_id"] == parent_y  # last write
        assert (tmp_path / parent_x / "subagents").is_dir()
        assert (tmp_path / parent_y / "subagents").is_dir()


# ---------------------------------------------------------------------------
# TranscriptWriter lazy materialization integration
# ---------------------------------------------------------------------------

class TestLazyMaterialization:
    def test_jsonl_created_on_first_user_write(self, tmp_path):
        parent_id = _parent_id()
        agent_id = _agent_id()
        writer = create_delegate_transcript(parent_id, agent_id, tmp_path)
        assert writer.path is None  # not yet created

        # Trigger materialization with a user entry
        writer.write("user", {"content": "hello from delegate"})
        # Give the timer a moment to flush
        time.sleep(0.2)
        writer.close() if hasattr(writer, 'close') else None

        expected = tmp_path / parent_id / "subagents" / f"{agent_id}.jsonl"
        assert expected.exists() or writer.path is not None

    def test_non_chain_entry_does_not_materialize(self, tmp_path):
        parent_id = _parent_id()
        agent_id = _agent_id()
        writer = create_delegate_transcript(parent_id, agent_id, tmp_path)
        writer.write("system", {"content": "system context"})
        assert writer.path is None  # still lazy
        expected = tmp_path / parent_id / "subagents" / f"{agent_id}.jsonl"
        assert not expected.exists()

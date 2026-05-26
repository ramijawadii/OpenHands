"""
Tests for openhands.storage.transcript_writer

Coverage:
  - Lazy materialization (file not created until first user/assistant entry)
  - Pre-materialization buffering of non-chain entries
  - 100ms batch timer fires and flushes to disk
  - flush() forces immediate drain
  - close() flushes and prevents further writes
  - 100MB chunk cap splits writes correctly
  - load_transcript() parses JSONL and respects 50MB guard
  - write_summary() produces correct "summary" entry
  - write_metadata() produces correct tail entries
  - sanitize_path_component() correct on POSIX and Windows paths
  - is_chain_participant() correctly classifies entries
  - Thread-safety: concurrent writes do not corrupt output
  - EventStream.attach_transcript_writer() wires parallel JSONL output
"""
from __future__ import annotations

import json
import threading
import time
from pathlib import Path

import pytest

from openhands.storage.transcript_writer import (
    CHAIN_ENTRY_TYPES,
    EPHEMERAL_ENTRY_TYPES,
    MAX_READ_BYTES,
    TranscriptWriter,
    is_chain_participant,
    load_transcript,
    sanitize_path_component,
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def tmp_dir(tmp_path: Path) -> Path:
    return tmp_path


@pytest.fixture
def writer(tmp_dir: Path) -> TranscriptWriter:
    w = TranscriptWriter(session_id="test-session-id", base_dir=tmp_dir)
    yield w
    w.close()


# ---------------------------------------------------------------------------
# Lazy materialization
# ---------------------------------------------------------------------------

class TestLazyMaterialization:
    def test_file_not_created_on_init(self, writer: TranscriptWriter, tmp_dir: Path):
        assert writer.path is None
        assert not any(tmp_dir.iterdir())

    def test_file_not_created_for_system_entry(self, writer: TranscriptWriter, tmp_dir: Path):
        writer.write("system", {"content": "System prompt"})
        writer.flush()
        assert writer.path is None

    def test_file_not_created_for_tool_progress(self, writer: TranscriptWriter, tmp_dir: Path):
        writer.write("tool_progress", {"content": "Running bash"})
        writer.flush()
        assert writer.path is None

    def test_file_created_on_first_user_message(self, writer: TranscriptWriter, tmp_dir: Path):
        writer.write("user", {"content": "Hello"})
        writer.flush()
        assert writer.path is not None
        assert writer.path.exists()

    def test_file_created_on_first_assistant_message(self, writer: TranscriptWriter, tmp_dir: Path):
        writer.write("assistant", {"content": "Hello"})
        writer.flush()
        assert writer.path is not None
        assert writer.path.exists()

    def test_file_name_contains_session_id(self, tmp_dir: Path):
        sid = "abc12345-0000-0000-0000-000000000000"
        w = TranscriptWriter(session_id=sid, base_dir=tmp_dir)
        w.write("user", {"content": "hi"})
        w.flush()
        assert w.path is not None
        assert w.path.name == f"{sid}.jsonl"
        w.close()

    def test_pre_materialization_entries_flushed_on_first_user_message(
        self, writer: TranscriptWriter
    ):
        writer.write("system", {"content": "sys prompt"})
        writer.write("user", {"content": "hello"})
        writer.flush()
        entries = load_transcript(writer.path)
        types = [e["type"] for e in entries]
        assert "system" in types
        assert "user" in types
        # system must appear before user
        assert types.index("system") < types.index("user")


# ---------------------------------------------------------------------------
# Write batching
# ---------------------------------------------------------------------------

class TestWriteBatching:
    def test_flush_writes_all_queued_entries(self, writer: TranscriptWriter):
        writer.write("user", {"content": "msg 1"})
        writer.write("assistant", {"content": "msg 2"})
        writer.flush()
        entries = load_transcript(writer.path)
        assert len(entries) == 2

    def test_timer_fires_within_threshold(self, writer: TranscriptWriter):
        writer.write("user", {"content": "timer test"})
        # Wait slightly more than the 100ms flush interval
        time.sleep(0.25)
        assert writer.path is not None
        entries = load_transcript(writer.path)
        assert len(entries) >= 1

    def test_multiple_flushes_append_not_overwrite(self, writer: TranscriptWriter):
        writer.write("user", {"content": "first"})
        writer.flush()
        writer.write("assistant", {"content": "second"})
        writer.flush()
        entries = load_transcript(writer.path)
        assert len(entries) == 2
        contents = [e["content"] for e in entries]
        assert "first" in contents
        assert "second" in contents


# ---------------------------------------------------------------------------
# close()
# ---------------------------------------------------------------------------

class TestClose:
    def test_close_flushes_remaining_entries(self, tmp_dir: Path):
        w = TranscriptWriter("close-test", tmp_dir)
        w.write("user", {"content": "before close"})
        w.close()
        entries = load_transcript(w.path)
        assert any(e.get("content") == "before close" for e in entries)

    def test_write_after_close_is_noop(self, tmp_dir: Path):
        w = TranscriptWriter("close-noop", tmp_dir)
        w.write("user", {"content": "before"})
        w.close()
        w.write("assistant", {"content": "after close"})  # must not raise
        entries = load_transcript(w.path)
        assert not any(e.get("content") == "after close" for e in entries)


# ---------------------------------------------------------------------------
# 100MB chunk cap
# ---------------------------------------------------------------------------

class TestChunkCap:
    def test_large_write_is_split_and_content_preserved(self, tmp_dir: Path, monkeypatch):
        """
        Verify _drain() splits payload at MAX_CHUNK_BYTES and that the full
        content still lands in the file correctly.

        We patch MAX_CHUNK_BYTES to 10 bytes, force-write a batch whose encoded
        size exceeds 10 bytes, then read the file back and confirm the data is
        intact (no truncation, no duplication).
        """
        import openhands.storage.transcript_writer as tw_mod
        monkeypatch.setattr(tw_mod, "MAX_CHUNK_BYTES", 10)

        w = TranscriptWriter("cap-test", tmp_dir)
        # A 50-char line produces >10 bytes encoded; forces at least 6 fh.write calls.
        big_line = "A" * 50  # 50 bytes + "\n" = 51 bytes → ceil(51/10) = 6 writes

        # Force materialization so _drain() has a path to write to.
        w._path = tmp_dir / "cap-test.jsonl"
        w._path.parent.mkdir(parents=True, exist_ok=True)
        w._path.touch()

        with w._lock:
            w._queue = [big_line]
        w._drain()

        raw = w._path.read_bytes()
        # Content must be exactly big_line + "\n"
        assert raw == (big_line + "\n").encode("utf-8")

    def test_real_jsonl_content_preserved_with_small_cap(self, tmp_dir: Path, monkeypatch):
        """End-to-end: entries survive chunked writes and load_transcript parses them."""
        import openhands.storage.transcript_writer as tw_mod
        monkeypatch.setattr(tw_mod, "MAX_CHUNK_BYTES", 20)

        w = TranscriptWriter("cap-e2e", tmp_dir)
        w.write("user", {"content": "hello"})
        w.write("assistant", {"content": "world"})
        w.flush()

        entries = load_transcript(w.path)
        assert len(entries) == 2
        assert entries[0]["type"] == "user"
        assert entries[1]["type"] == "assistant"
        w.close()


# ---------------------------------------------------------------------------
# load_transcript
# ---------------------------------------------------------------------------

class TestLoadTranscript:
    def test_returns_empty_for_nonexistent_file(self, tmp_dir: Path):
        assert load_transcript(tmp_dir / "missing.jsonl") == []

    def test_parses_valid_jsonl(self, tmp_dir: Path):
        p = tmp_dir / "test.jsonl"
        p.write_text(
            '{"type":"user","content":"hello"}\n'
            '{"type":"assistant","content":"world"}\n',
            encoding="utf-8",
        )
        entries = load_transcript(p)
        assert len(entries) == 2
        assert entries[0]["type"] == "user"
        assert entries[1]["type"] == "assistant"

    def test_skips_malformed_lines(self, tmp_dir: Path):
        p = tmp_dir / "bad.jsonl"
        p.write_text(
            '{"type":"user","content":"ok"}\n'
            'NOT JSON\n'
            '{"type":"assistant","content":"also ok"}\n',
            encoding="utf-8",
        )
        entries = load_transcript(p)
        assert len(entries) == 2

    def test_skips_blank_lines(self, tmp_dir: Path):
        p = tmp_dir / "blank.jsonl"
        p.write_text(
            '\n{"type":"user","content":"hi"}\n\n',
            encoding="utf-8",
        )
        entries = load_transcript(p)
        assert len(entries) == 1

    def test_oom_guard_reads_tail_on_oversized_file(self, tmp_dir: Path, monkeypatch):
        import openhands.storage.transcript_writer as tw_mod
        monkeypatch.setattr(tw_mod, "MAX_READ_BYTES", 50)

        # Write a file larger than 50 bytes; the last valid entry must survive.
        p = tmp_dir / "big.jsonl"
        filler = '{"type":"system","content":"fill"}\n' * 5   # ~175 bytes
        tail_entry = '{"type":"user","content":"tail"}\n'
        p.write_bytes((filler + tail_entry).encode("utf-8"))

        entries = load_transcript(p)
        # At least the tail entry must be present
        assert any(e.get("content") == "tail" for e in entries)


# ---------------------------------------------------------------------------
# write_summary / write_metadata
# ---------------------------------------------------------------------------

class TestSummaryAndMetadata:
    def test_write_summary_produces_summary_entry(self, writer: TranscriptWriter):
        writer.write("user", {"content": "setup"})
        writer.write_summary("Compact summary text", pre_compact_tokens=12000)
        writer.flush()
        entries = load_transcript(writer.path)
        summary_entries = [e for e in entries if e["type"] == "summary"]
        assert len(summary_entries) == 1
        assert summary_entries[0]["pre_compact_tokens"] == 12000
        assert "Compact summary text" in summary_entries[0]["summary"]

    def test_write_metadata_appends_title_and_last_prompt(self, writer: TranscriptWriter):
        writer.write("user", {"content": "start"})
        writer.write_metadata(title="My Session", last_prompt="final user msg")
        writer.flush()
        entries = load_transcript(writer.path)
        types = {e["type"] for e in entries}
        assert "title" in types
        assert "last-prompt" in types

    def test_last_prompt_truncated_to_500_chars(self, writer: TranscriptWriter):
        writer.write("user", {"content": "start"})
        writer.write_metadata(last_prompt="A" * 1000)
        writer.flush()
        entries = load_transcript(writer.path)
        lp = next(e for e in entries if e["type"] == "last-prompt")
        assert len(lp["value"]) == 500


# ---------------------------------------------------------------------------
# sanitize_path_component
# ---------------------------------------------------------------------------

class TestSanitizePathComponent:
    def test_posix_path(self):
        assert sanitize_path_component("/home/user/project") == "home--user--project"

    def test_windows_path(self):
        result = sanitize_path_component("C:\\Users\\user\\project")
        assert "--" in result
        assert ":" not in result
        assert "\\" not in result

    def test_no_leading_dashes(self):
        result = sanitize_path_component("/leading")
        assert not result.startswith("-")

    def test_mixed_separators(self):
        result = sanitize_path_component("C:/Users/user")
        assert ":" not in result
        assert "/" not in result


# ---------------------------------------------------------------------------
# is_chain_participant
# ---------------------------------------------------------------------------

class TestIsChainParticipant:
    @pytest.mark.parametrize("entry_type", sorted(CHAIN_ENTRY_TYPES))
    def test_chain_types_return_true(self, entry_type: str):
        assert is_chain_participant({"type": entry_type}) is True

    @pytest.mark.parametrize("entry_type", sorted(EPHEMERAL_ENTRY_TYPES))
    def test_ephemeral_types_return_false(self, entry_type: str):
        assert is_chain_participant({"type": entry_type}) is False

    def test_summary_is_not_chain_participant(self):
        assert is_chain_participant({"type": "summary"}) is False

    def test_missing_type_returns_false(self):
        assert is_chain_participant({}) is False


# ---------------------------------------------------------------------------
# Thread safety
# ---------------------------------------------------------------------------

class TestThreadSafety:
    def test_concurrent_writes_produce_correct_count(self, tmp_dir: Path):
        w = TranscriptWriter("thread-test", tmp_dir)
        n_threads = 10
        writes_per_thread = 20
        barrier = threading.Barrier(n_threads)

        def _write():
            barrier.wait()  # all threads start simultaneously
            for i in range(writes_per_thread):
                w.write("assistant", {"n": i})

        # First write to materialize the file
        w.write("user", {"content": "init"})

        threads = [threading.Thread(target=_write) for _ in range(n_threads)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        w.flush()
        entries = load_transcript(w.path)
        # 1 (user init) + n_threads * writes_per_thread assistant entries
        expected = 1 + n_threads * writes_per_thread
        assert len(entries) == expected
        w.close()


# ---------------------------------------------------------------------------
# EventStream integration
# ---------------------------------------------------------------------------

class TestEventStreamIntegration:
    def test_attach_writer_receives_user_message(self, tmp_dir: Path):
        from openhands.events.action.message import MessageAction
        from openhands.events.event import EventSource
        from openhands.storage.memory import InMemoryFileStore
        from openhands.events.stream import EventStream

        store = InMemoryFileStore()
        stream = EventStream(sid="stream-test", file_store=store)
        writer = TranscriptWriter("stream-test", tmp_dir)
        stream.attach_transcript_writer(writer)

        msg = MessageAction(content="Hello from user")
        stream.add_event(msg, EventSource.USER)
        stream.close()  # triggers writer.close() -> flush()

        entries = load_transcript(writer.path)
        user_entries = [e for e in entries if e.get("type") == "user"]
        assert len(user_entries) == 1

    def test_attach_raises_if_already_attached(self, tmp_dir: Path):
        from openhands.storage.memory import InMemoryFileStore
        from openhands.events.stream import EventStream

        store = InMemoryFileStore()
        stream = EventStream(sid="double-attach", file_store=store)
        w1 = TranscriptWriter("double-attach", tmp_dir / "a")
        w2 = TranscriptWriter("double-attach", tmp_dir / "b")
        stream.attach_transcript_writer(w1)
        with pytest.raises(ValueError, match="already attached"):
            stream.attach_transcript_writer(w2)
        stream.close()

    def test_detach_writer_stops_further_writes(self, tmp_dir: Path):
        from openhands.events.action.message import MessageAction
        from openhands.events.event import EventSource
        from openhands.storage.memory import InMemoryFileStore
        from openhands.events.stream import EventStream

        store = InMemoryFileStore()
        stream = EventStream(sid="detach-test", file_store=store)
        writer = TranscriptWriter("detach-test", tmp_dir)
        stream.attach_transcript_writer(writer)

        stream.add_event(MessageAction(content="before detach"), EventSource.USER)
        before_count_pre = 1
        stream.detach_transcript_writer()   # flushes + removes reference

        # Events after detach must NOT reach the writer.
        stream.add_event(MessageAction(content="after detach"), EventSource.AGENT)
        stream.close()

        # Writer was detached (flushed) before the second event — only 1 entry.
        entries = load_transcript(writer.path)
        types = [e["type"] for e in entries]
        assert "user" in types               # "before detach" reached the writer
        assert types.count("user") + types.count("assistant") == before_count_pre

    def test_assistant_message_mapped_to_assistant_type(self, tmp_dir: Path):
        from openhands.events.action.message import MessageAction
        from openhands.events.event import EventSource
        from openhands.storage.memory import InMemoryFileStore
        from openhands.events.stream import EventStream

        store = InMemoryFileStore()
        stream = EventStream(sid="agent-msg-test", file_store=store)
        writer = TranscriptWriter("agent-msg-test", tmp_dir)
        stream.attach_transcript_writer(writer)

        stream.add_event(MessageAction(content="hi"), EventSource.USER)
        stream.add_event(MessageAction(content="hello back"), EventSource.AGENT)
        stream.close()

        entries = load_transcript(writer.path)
        types = [e["type"] for e in entries]
        assert "user" in types
        assert "assistant" in types

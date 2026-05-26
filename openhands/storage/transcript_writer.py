"""
Append-only JSONL transcript writer for OpenHands CloudGuard fork.

Architecture
------------
Mirrors Claude Code's ``src/utils/sessionStorage.ts`` ``Project`` class.

One ``TranscriptWriter`` instance per session, attached to ``EventStream`` via
``EventStream.attach_transcript_writer()``.  Runs **in parallel** with the
existing per-event JSON file store during the transition period — the old store
remains authoritative for event replay; the JSONL file is used for fast
session listing, compaction boundary markers, and post-compact resume.

Key invariants
--------------
* **Lazy materialization** — the ``.jsonl`` file is not created until the first
  user or assistant message.  Pre-materialization events (system prompts, tool
  context) are buffered and flushed when the file is first created.
* **Batched writes** — events are queued and flushed every ``FLUSH_INTERVAL_MS``
  milliseconds via a daemon ``threading.Timer``, not on every call.
* **100 MB chunk cap** — ``_drain()`` never issues a single write larger than
  ``MAX_CHUNK_BYTES``; oversized payloads are split across multiple ``fh.write``
  calls to avoid allocation spikes.
* **50 MB OOM guard** — ``load_transcript()`` reads at most ``MAX_READ_BYTES``
  from the tail of an oversized file.
* **Thread-safe** — a single ``threading.Lock`` protects ``_queue``, ``_pending``,
  ``_path``, and ``_timer``.  ``_drain()`` is always called with the lock
  *released* so it does not block the ``add_event`` hot path.
"""
from __future__ import annotations

import json
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

FLUSH_INTERVAL_MS = 100                    # batch writes every 100 ms
MAX_CHUNK_BYTES   = 100 * 1024 * 1024      # 100 MB max per fh.write call
MAX_READ_BYTES    = 50  * 1024 * 1024      # 50 MB OOM guard on load

# Entry types that participate in message chain reconstruction for resume.
CHAIN_ENTRY_TYPES: frozenset[str] = frozenset({
    "user", "assistant", "system", "attachment",
})

# Ephemeral entry types — written to transcript but excluded from chain walk.
EPHEMERAL_ENTRY_TYPES: frozenset[str] = frozenset({
    "tool_progress",
    "bash_progress",
    "mcp_progress",
    "file_write_progress",
    "file_read_progress",
})

# Types appended to the JSONL tail for fast session listing (64 KB head+tail).
TAIL_METADATA_TYPES: frozenset[str] = frozenset({
    "title", "tag", "last-prompt", "agent-name",
})


# ---------------------------------------------------------------------------
# TranscriptWriter
# ---------------------------------------------------------------------------

class TranscriptWriter:
    """
    One instance per session.  Batches JSONL writes, enforces lazy
    materialization, and respects the 100 MB chunk cap.

    Parameters
    ----------
    session_id:
        UUID v4 string identifying the session; used as the filename stem.
    base_dir:
        Directory under which ``{session_id}.jsonl`` will be created.
        Not created until first user/assistant message.
    """

    def __init__(self, session_id: str, base_dir: Path) -> None:
        self.session_id = session_id
        self._base_dir = base_dir
        self._path: Optional[Path] = None      # None until lazy materialization
        self._pending: list[str] = []          # buffered pre-materialization entries
        self._queue:   list[str] = []          # entries awaiting next drain
        self._lock = threading.Lock()
        self._timer: Optional[threading.Timer] = None
        self._closed = False

    # -----------------------------------------------------------------------
    # Public API
    # -----------------------------------------------------------------------

    @property
    def path(self) -> Optional[Path]:
        """Path to the JSONL file, or ``None`` if not yet materialized."""
        return self._path

    def write(self, entry_type: str, data: dict) -> None:
        """
        Enqueue one JSONL entry.

        Pre-materialization entries of types other than ``"user"`` or
        ``"assistant"`` are buffered until the file is created.  The file is
        created on the first user or assistant entry.

        Parameters
        ----------
        entry_type:
            One of the entry type constants (``"user"``, ``"assistant"``,
            ``"system"``, ``"tool_progress"``, ``"summary"``, etc.).
        data:
            Dict of additional fields to merge into the entry.
        """
        if self._closed:
            return

        record = json.dumps(
            {
                "type": entry_type,
                "timestamp": datetime.now(tz=timezone.utc).isoformat(),
                **data,
            },
            ensure_ascii=False,
        )

        with self._lock:
            if self._path is None:
                # Pre-materialization: buffer non-chain entries; create file on
                # first user/assistant entry.
                if entry_type not in ("user", "assistant"):
                    self._pending.append(record)
                    return
                # --- First user/assistant message: materialize now ---
                self._path = self._base_dir / f"{self.session_id}.jsonl"
                self._path.parent.mkdir(parents=True, exist_ok=True)
                # Move buffered pre-materialization entries into the drain queue.
                self._queue.extend(self._pending)
                self._pending.clear()

            self._queue.append(record)
            self._schedule_drain_if_needed()

    def write_summary(self, summary_text: str, pre_compact_tokens: int) -> None:
        """
        Write a compaction boundary marker.

        This is the JSONL equivalent of the ``summary`` entry in Claude Code's
        transcript.  Future resume pipelines look for this marker to load only
        post-compaction messages as live context.
        """
        self.write("summary", {
            "summary": summary_text,
            "pre_compact_tokens": pre_compact_tokens,
        })

    def write_metadata(
        self,
        title: Optional[str] = None,
        last_prompt: Optional[str] = None,
        tag: Optional[str] = None,
    ) -> None:
        """
        Re-append metadata entries to the transcript tail.

        Called after compaction to ensure the 64 KB head+tail session listing
        still works.  Mirrors Claude Code's ``reAppendSessionMetadata()``.
        """
        if title:
            self.write("title", {"value": title})
        if last_prompt:
            # Truncate to 500 chars so listing reads stay bounded.
            self.write("last-prompt", {"value": last_prompt[:500]})
        if tag:
            self.write("tag", {"value": tag})

    def flush(self) -> None:
        """Force-flush the queue to disk (e.g. before process exit or test teardown)."""
        with self._lock:
            if self._timer is not None:
                self._timer.cancel()
                self._timer = None
        self._drain()

    def close(self) -> None:
        """Flush remaining entries and mark the writer as closed."""
        with self._lock:
            self._closed = True
            if self._timer is not None:
                self._timer.cancel()
                self._timer = None
        self._drain()

    # -----------------------------------------------------------------------
    # Internal helpers
    # -----------------------------------------------------------------------

    def _schedule_drain_if_needed(self) -> None:
        """Start the flush timer if one is not already running.  Called under lock."""
        if self._timer is None:
            t = threading.Timer(FLUSH_INTERVAL_MS / 1000.0, self._drain)
            t.daemon = True
            t.start()
            self._timer = t

    def _drain(self) -> None:
        """
        Write queued entries to disk.

        Called from the background timer thread or directly from ``flush()``/
        ``close()``.  Acquires the lock only long enough to swap the queue.
        """
        with self._lock:
            if not self._queue:
                self._timer = None
                return
            batch, self._queue = self._queue, []
            self._timer = None
            path = self._path

        if path is None:
            # Should not happen (timer is started only after materialization)
            # but guard against any race just in case.
            return

        chunk = "\n".join(batch) + "\n"
        encoded = chunk.encode("utf-8")
        with path.open("ab") as fh:
            # Never write more than MAX_CHUNK_BYTES in a single call.
            for offset in range(0, len(encoded), MAX_CHUNK_BYTES):
                fh.write(encoded[offset : offset + MAX_CHUNK_BYTES])

    def _derive_path(self) -> Path:
        """Return the JSONL file path for this session."""
        return self._base_dir / f"{self.session_id}.jsonl"


# ---------------------------------------------------------------------------
# Path sanitization helper
# ---------------------------------------------------------------------------

def sanitize_path_component(abs_path: str) -> str:
    """
    Convert an absolute path to a filesystem-safe directory name.

    Mirrors Claude Code's ``sanitizePath()``:
      ``'/home/user/project'``  →  ``'home--user--project'``
      ``'C:\\Users\\user'``      →  ``'C--Users--user'``

    Used to derive the ``base_dir`` from the working directory:
    ``~/.openhands/projects/{sanitize_path_component(cwd)}/``
    """
    import re
    sanitized = re.sub(r"[/\\:]", "--", abs_path)
    return sanitized.lstrip("-")


# ---------------------------------------------------------------------------
# Transcript reader
# ---------------------------------------------------------------------------

def load_transcript(path: Path) -> list[dict]:
    """
    Load a JSONL transcript file with a 50 MB OOM guard.

    For files larger than ``MAX_READ_BYTES``, only the tail is read (byte-seek
    to ``-MAX_READ_BYTES`` from end).  Any truncated or malformed lines are
    silently skipped — a truncated tail read may yield one broken first line.

    Returns a list of parsed entry dicts.
    """
    if not path.exists():
        return []

    size = path.stat().st_size
    if size > MAX_READ_BYTES:
        with path.open("rb") as fh:
            fh.seek(-MAX_READ_BYTES, 2)
            raw = fh.read()
    else:
        raw = path.read_bytes()

    entries: list[dict] = []
    for line in raw.decode("utf-8", errors="replace").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            entries.append(json.loads(line))
        except json.JSONDecodeError:
            continue   # skip malformed / truncated lines at tail boundary
    return entries


def is_chain_participant(entry: dict) -> bool:
    """Return True if this transcript entry participates in chain reconstruction."""
    return entry.get("type") in CHAIN_ENTRY_TYPES

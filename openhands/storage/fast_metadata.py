"""
Fast session-metadata reads for OpenHands CloudGuard fork.

Layer 10 of the session/context management upgrade.

Mirrors Claude Code's ``readSessionLite()`` from
``src/utils/sessionStoragePortable.ts``.

Algorithm
---------
Read the first ``LITE_READ_BUF`` bytes (head) and the last ``LITE_READ_BUF``
bytes (tail) of a JSONL transcript file without loading the full file.
Extract structured fields via compiled regex patterns.

This is the public, standalone counterpart to the private
``_restore_session_metadata_fast()`` function in ``session_resume.py``.
It can be called from the conversation-listing API to build fast session
previews for hundreds of sessions without memory pressure.

Thread safety
-------------
The module-level regex cache (``_RE_CACHE``) is populated lazily and only
ever written with the same value for a given key, so concurrent writes are
idempotent and no lock is needed.
"""
from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

LITE_READ_BUF: int = 65_536   # 64 KB: enough for all tail-metadata entries

# Compiled regex cache — keyed by field name, value is the compiled pattern.
_RE_CACHE: dict[str, re.Pattern] = {}


# ---------------------------------------------------------------------------
# FastSessionMetadata
# ---------------------------------------------------------------------------

@dataclass
class FastSessionMetadata:
    """
    Lightweight session metadata extractable from the first+last 64 KB of a
    JSONL transcript without a full parse.

    All fields are ``None`` when the corresponding entry has never been
    written to the transcript (e.g. a brand-new session with no messages).
    """
    title:      Optional[str] = None
    last_prompt: Optional[str] = None
    tag:        Optional[str] = None
    agent_name: Optional[str] = None
    created_at: Optional[str] = None

    def to_dict(self) -> dict:
        """Return a JSON-serializable dict omitting ``None`` values."""
        return {k: v for k, v in {
            "title":       self.title,
            "last_prompt": self.last_prompt,
            "tag":         self.tag,
            "agent_name":  self.agent_name,
            "created_at":  self.created_at,
        }.items() if v is not None}


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def read_fast_metadata(path: Path | str) -> FastSessionMetadata:
    """
    Extract session metadata from a JSONL transcript using only a 64 KB
    head+tail read.

    Parameters
    ----------
    path:
        Absolute path to the ``{session_id}.jsonl`` transcript file.

    Returns
    -------
    FastSessionMetadata
        All fields are ``None`` when the file does not exist or is empty.
    """
    path = Path(path)
    if not path.exists():
        return FastSessionMetadata()

    try:
        size = path.stat().st_size
        with open(path, "rb") as fh:
            head_bytes = fh.read(LITE_READ_BUF)
            tail_start = max(0, size - LITE_READ_BUF)
            fh.seek(tail_start)
            tail_bytes = fh.read()
    except OSError:
        return FastSessionMetadata()

    head = head_bytes.decode("utf-8", errors="replace")
    tail = tail_bytes.decode("utf-8", errors="replace")

    return FastSessionMetadata(
        title=      _extract_last(tail, "title",       "value"),
        last_prompt=_extract_last(tail, "last-prompt", "value"),
        tag=        _extract_last(tail, "tag",          "value"),
        agent_name= _extract_last(tail, "agent-name",  "value"),
        created_at= _extract_first(head, "timestamp"),
    )


def read_fast_metadata_many(
    paths: list[Path | str],
) -> list[FastSessionMetadata]:
    """
    Read fast metadata for multiple transcripts.

    Skips missing files silently (returns ``FastSessionMetadata()`` for each).
    Maintains the same order as *paths*.
    """
    return [read_fast_metadata(p) for p in paths]


# ---------------------------------------------------------------------------
# Internal helpers (verbatim design from Claude Code reference)
# ---------------------------------------------------------------------------

def _get_pattern(key: str) -> re.Pattern:
    """Return (and cache) a compiled regex that matches ``"key": "..."``."""
    pat = _RE_CACHE.get(key)
    if pat is None:
        pat = re.compile(
            r'"' + re.escape(key) + r'"\s*:\s*"((?:[^"\\]|\\.)*)"'
        )
        _RE_CACHE[key] = pat
    return pat


def _extract_first(text: str, key: str) -> Optional[str]:
    """
    Return the **first** JSON string value for *key* in *text*, or ``None``.

    Used for ``"timestamp"`` in the file head (earliest entry = creation time).
    """
    m = _get_pattern(key).search(text)
    if m is None:
        return None
    return _unescape(m.group(1))


def _extract_last(text: str, entry_type: str, field_key: str) -> Optional[str]:
    """
    Return the value of *field_key* from the **last** entry of *entry_type*
    in *text*, or ``None``.

    Handles both compact JSON (``"type":"title"``) and spaced JSON
    (``"type": "title"``) since ``json.dumps`` default separators include a
    space after the colon.  Tries the compact form first then the spaced form;
    returns the right-most match found.
    """
    last_idx = -1
    for marker in (f'"type":"{entry_type}"', f'"type": "{entry_type}"'):
        idx = text.rfind(marker)
        if idx > last_idx:
            last_idx = idx
    if last_idx == -1:
        return None
    return _extract_first(text[last_idx:], field_key)


def _unescape(raw: str) -> str:
    """
    Minimally unescape a JSON string body (between the outer quotes).

    Handles ``\\``, ``\"``, ``\\n``, ``\\r``, ``\\t``.  Leaves other escape
    sequences (``\\uXXXX``, etc.) intact for the caller to handle if needed.
    """
    return (
        raw
        .replace('\\"', '"')
        .replace('\\\\', '\\')
        .replace('\\n', '\n')
        .replace('\\r', '\r')
        .replace('\\t', '\t')
    )

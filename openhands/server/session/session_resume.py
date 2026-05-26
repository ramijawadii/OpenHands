"""
Structured 8-step session resume pipeline for OpenHands CloudGuard fork.

Mirrors Claude Code's ``src/utils/sessionRestore.ts``.

Architecture note
-----------------
Claude Code's ``SESSION`` is a process singleton because it is a single-session CLI.
OpenHands is multi-tenant: the optional ``session_state`` parameter lets the
caller supply the per-session ``_SessionState`` instance directly, avoiding a
singleton.  When ``session_state`` is ``None``, the identity-swap step is skipped
(pure read-only resume without an associated live session).
"""
from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from openhands.server.session.session_state import _SessionState

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

MAX_READ_BYTES: int = 50 * 1024 * 1024   # 50 MB OOM guard
LITE_READ_BUF:  int = 65_536             # 64 KB fast metadata read


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

def resume_session(
    session_id: str,
    transcript_base_dir: Path,
    session_state: Optional["_SessionState"] = None,
) -> dict:
    """
    Full 8-step session resume.

    Parameters
    ----------
    session_id:
        UUID of the session to resume.
    transcript_base_dir:
        Directory that contains ``{session_id}.jsonl``.
    session_state:
        If provided, its ``switch_session()`` is called (step 1) to atomically
        swap the identity of the running WebSession.  Pass ``None`` for
        read-only resume (e.g. unit tests, analytics).

    Returns
    -------
    dict with keys:

    ``live_messages``
        ``list[dict]`` — post-boundary messages ready for LLM context.
    ``metadata``
        ``dict`` — title, last_prompt, tag, created_at.
    ``cost_state``
        ``dict`` — accumulated token usage.
    ``env_map``
        ``dict`` — reconstructed environment state from checkpoint entries.
    ``boundary_found``
        ``bool`` — whether a compaction boundary was present.
    ``transcript_path``
        ``str`` — absolute path to the transcript file (may not exist yet).
    """
    transcript_path = transcript_base_dir / f"{session_id}.jsonl"

    # Step 1: Atomic identity swap
    if session_state is not None:
        session_state.switch_session(session_id, str(transcript_path))

    # Step 3: Load entries
    entries = _load_transcript_entries(transcript_path)

    # Step 4: Restore accumulated token costs
    cost_state = _restore_cost_state(entries)

    # Step 5: Restore session metadata from JSONL tail
    metadata = _restore_session_metadata_fast(transcript_path)

    # Steps 7-8: Find the last compaction boundary, keep only post-boundary
    boundary_idx = _find_last_compaction_boundary(entries)
    if boundary_idx is not None:
        live_entries = entries[boundary_idx:]   # inclusive: summary entry + all following
        boundary_found = True
    else:
        live_entries = entries
        boundary_found = False

    # Convert chain entries to LLM message format
    live_messages = _entries_to_messages(live_entries)

    # Reconstruct environment map from checkpoint entries
    env_map = _reconstruct_env_map(entries)

    return {
        "live_messages":   live_messages,
        "metadata":        metadata,
        "cost_state":      cost_state,
        "env_map":         env_map,
        "boundary_found":  boundary_found,
        "transcript_path": str(transcript_path),
    }


# ---------------------------------------------------------------------------
# Step 3 — Load transcript entries
# ---------------------------------------------------------------------------

def _load_transcript_entries(path: Path) -> list[dict]:
    """
    Parse a JSONL transcript file with a 50 MB OOM guard.

    For files exceeding ``MAX_READ_BYTES``, the tail is read so that the most
    recent compaction boundary (if any) is always present.  Malformed lines
    and blank lines are silently skipped.
    """
    if not path.exists():
        return []
    size = path.stat().st_size
    if size > MAX_READ_BYTES:
        with open(path, "rb") as fh:
            fh.seek(-MAX_READ_BYTES, 2)
            data = fh.read()
    else:
        data = path.read_bytes()

    entries: list[dict] = []
    for line in data.decode("utf-8", errors="replace").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            entries.append(json.loads(line))
        except json.JSONDecodeError:
            continue
    return entries


# ---------------------------------------------------------------------------
# Step 4 — Restore cost state
# ---------------------------------------------------------------------------

def _restore_cost_state(entries: list[dict]) -> dict:
    """
    Accumulate token usage from all entries that carry a ``usage`` block.

    These are produced by the LLM call logger in ``llm.py`` and stored as
    ``{"type": "assistant", ..., "usage": {"prompt_tokens": N, ...}}``.
    """
    prompt_tokens     = 0
    completion_tokens = 0
    for e in entries:
        usage = e.get("usage") or {}
        prompt_tokens     += usage.get("prompt_tokens",     0)
        completion_tokens += usage.get("completion_tokens", 0)
    return {
        "accumulated_prompt_tokens":     prompt_tokens,
        "accumulated_completion_tokens": completion_tokens,
        "accumulated_total_tokens":      prompt_tokens + completion_tokens,
    }


# ---------------------------------------------------------------------------
# Step 5 — Restore session metadata (fast 64 KB read)
# ---------------------------------------------------------------------------

def _restore_session_metadata_fast(path: Path) -> dict:
    """
    Read the file's 64 KB head and 64 KB tail to extract title, last_prompt,
    tag, and created_at without a full parse.

    Mirrors Claude Code's ``readSessionLite()`` from
    ``src/utils/sessionStoragePortable.ts``.
    """
    try:
        size = path.stat().st_size
        with open(path, "rb") as fh:
            fh.seek(0)
            head = fh.read(LITE_READ_BUF).decode("utf-8", errors="replace")
            tail_start = max(0, size - LITE_READ_BUF)
            fh.seek(tail_start)
            tail = fh.read().decode("utf-8", errors="replace")
    except OSError:
        return {}

    return {
        "title":       _extract_last_field(tail, "title",       "value"),
        "last_prompt": _extract_last_field(tail, "last-prompt", "value"),
        "tag":         _extract_last_field(tail, "tag",         "value"),
        "created_at":  _extract_field(head, "timestamp"),
    }


# ---------------------------------------------------------------------------
# Step 8a — Find last compaction boundary
# ---------------------------------------------------------------------------

def _find_last_compaction_boundary(entries: list[dict]) -> Optional[int]:
    """
    Return the index of the **last** ``"summary"`` entry in *entries*, or
    ``None`` if no compaction has occurred.

    Scanning in reverse is O(n) worst case but O(1) for recently-compacted
    sessions where the boundary is near the end.
    """
    for i in reversed(range(len(entries))):
        if entries[i].get("type") == "summary":
            return i
    return None


# ---------------------------------------------------------------------------
# Step 8b — Convert entries to LLM messages
# ---------------------------------------------------------------------------

def _entries_to_messages(entries: list[dict]) -> list[dict]:
    """
    Convert transcript entries to ``{"role": ..., "content": ...}`` API format.

    Only chain participants are included:

    ============= ============================================================
    Entry type    Conversion
    ============= ============================================================
    ``user``      ``{"role": "user", "content": entry["content"]}``
    ``assistant`` ``{"role": "assistant", "content": entry["content"]}``
    ``summary``   ``{"role": "user", "content": "This session is being continued…\\n\\n{summary}"}``
    ============= ============================================================

    Ephemeral entries (``tool_progress``, ``bash_progress``, ``title``,
    ``last-prompt``, ``tag``, ``system``) are excluded — they do not belong in
    the LLM context window.
    """
    messages: list[dict] = []
    for e in entries:
        t = e.get("type")
        if t == "user":
            messages.append({"role": "user",      "content": e.get("content", "")})
        elif t == "assistant":
            messages.append({"role": "assistant", "content": e.get("content", "")})
        elif t == "summary":
            messages.append({
                "role": "user",
                "content": (
                    "This session is being continued from a previous conversation. "
                    f"Summary of earlier work:\n\n{e.get('summary', '')}"
                ),
            })
        # Progress, tool_progress, title, last-prompt, tag, system, checkpoint
        # → excluded (ephemeral / metadata only)
    return messages


# ---------------------------------------------------------------------------
# Reconstruct environment map
# ---------------------------------------------------------------------------

def _reconstruct_env_map(entries: list[dict]) -> dict:
    """
    Backward-scan for the most recent ``"checkpoint"`` entry and return its
    ``env_summary`` payload.

    Mirrors Claude Code's ``restoreSessionStateFromLog()``.
    """
    for e in reversed(entries):
        if e.get("type") == "checkpoint":
            return e.get("env_summary") or {}
    return {}


# ---------------------------------------------------------------------------
# Regex field extraction helpers (no full JSON parse)
# ---------------------------------------------------------------------------

_STRING_FIELD_RE_CACHE: dict[str, re.Pattern] = {}


def _extract_field(text: str, key: str) -> Optional[str]:
    """
    Extract the **first** occurrence of a JSON string field value.

    Operates on raw text without parsing the full JSON — safe on truncated
    lines.  Verbatim from Claude Code's ``extractJsonStringField()``.

    Returns the decoded Python string, or ``None`` if not found.
    """
    if key not in _STRING_FIELD_RE_CACHE:
        _STRING_FIELD_RE_CACHE[key] = re.compile(
            r'"' + re.escape(key) + r'"\s*:\s*"((?:[^"\\]|\\.)*)"'
        )
    m = _STRING_FIELD_RE_CACHE[key].search(text)
    if not m:
        return None
    try:
        return json.loads('"' + m.group(1) + '"')
    except json.JSONDecodeError:
        return m.group(1)


def _extract_last_field(text: str, entry_type: str, field: str) -> Optional[str]:
    """
    Extract the **last** occurrence of *field* from within an entry whose
    ``type`` matches *entry_type*.

    Used for tail reads where the most recent metadata entry wins.
    Verbatim from Claude Code's ``extractLastJsonStringField()``.
    """
    marker = f'"type":"{entry_type}"'
    idx = text.rfind(marker)
    if idx == -1:
        return None
    return _extract_field(text[idx:], field)

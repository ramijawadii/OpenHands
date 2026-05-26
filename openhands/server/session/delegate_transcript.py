"""
Sub-agent transcript isolation — Layer 8 of the CloudGuard context-management upgrade.

When an AgentController spawns a delegate/sub-agent via DelegateAction, that
sub-agent's transcript must be isolated from the parent session's transcript.

Layout on disk
--------------
Parent session transcript:
    transcripts/{parent_session_id}.jsonl

Sub-agent transcript:
    transcripts/{parent_session_id}/subagents/agent-{agent_id}.jsonl

Sub-agent sidecar (fast listing without reading the JSONL):
    transcripts/{agent_id}.meta.json

Architecture note
-----------------
``create_delegate_transcript()`` is a module-level function (not a class method)
so it can be called from AgentController without importing session-specific
classes.  It returns a ``TranscriptWriter`` ready to attach to the delegate's
EventStream via ``EventStream.attach_transcript_writer()``.

The sidecar ``.meta.json`` is written synchronously at creation time (small,
one-shot write).  The main JSONL file follows the same lazy-materialization
rules as the parent: not created until the first user/assistant event.
"""
from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from openhands.storage.transcript_writer import TranscriptWriter

logger = logging.getLogger(__name__)

# Sidecar schema version — bump when the format changes
_SIDECAR_VERSION = 1


def create_delegate_transcript(
    parent_session_id: str,
    agent_id: str,
    base_dir: str | Path,
) -> TranscriptWriter:
    """
    Create a ``TranscriptWriter`` for a sub-agent spawned by ``parent_session_id``.

    The JSONL file is lazily materialized (not created until the first user or
    assistant message), following the same contract as the parent transcript.
    The sidecar ``.meta.json`` is written immediately so fast-listing can find
    the sub-agent before any messages have been exchanged.

    Parameters
    ----------
    parent_session_id:
        UUID of the parent session that is spawning the delegate.
    agent_id:
        Unique identifier for this sub-agent (typically a UUID or
        ``"{agent_name}-{counter}"`` string).
    base_dir:
        Root directory for all transcripts (e.g. ``~/.openhands/transcripts``).

    Returns
    -------
    TranscriptWriter
        Not yet materialized (no JSONL file on disk until first message).
    """
    base = Path(base_dir)

    # Sub-agent JSONL lives under {parent_session_id}/subagents/
    subagent_dir = base / parent_session_id / "subagents"
    subagent_dir.mkdir(parents=True, exist_ok=True)

    # Write sidecar immediately for fast listing
    _write_sidecar(base, agent_id, parent_session_id)

    writer = TranscriptWriter(session_id=agent_id, base_dir=subagent_dir)
    logger.debug(
        "delegate_transcript.create: agent=%s parent=%s dir=%s",
        agent_id,
        parent_session_id,
        subagent_dir,
    )
    return writer


def _write_sidecar(
    base_dir: Path,
    agent_id: str,
    parent_session_id: str,
    extra: Optional[dict] = None,
) -> Path:
    """
    Write ``{base_dir}/{agent_id}.meta.json`` with sub-agent metadata.

    Parameters
    ----------
    base_dir:
        Root transcript directory.
    agent_id:
        Sub-agent identifier (used as filename stem).
    parent_session_id:
        UUID of the parent session.
    extra:
        Optional additional fields merged into the sidecar (for extensibility).

    Returns
    -------
    Path
        Absolute path to the written sidecar file.
    """
    sidecar_path = base_dir / f"{agent_id}.meta.json"
    payload: dict = {
        "version":           _SIDECAR_VERSION,
        "type":              "subagent",
        "agent_id":          agent_id,
        "parent_session_id": parent_session_id,
        "created_at":        datetime.now(tz=timezone.utc).isoformat(),
    }
    if extra:
        payload.update(extra)

    sidecar_path.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
    return sidecar_path


def load_sidecar(base_dir: str | Path, agent_id: str) -> Optional[dict]:
    """
    Load and parse the sidecar for ``agent_id``, or return ``None`` if absent.

    Parameters
    ----------
    base_dir:
        Root transcript directory.
    agent_id:
        Sub-agent identifier.

    Returns
    -------
    dict or None
        Parsed sidecar payload, or ``None`` if the file does not exist or is
        malformed.
    """
    path = Path(base_dir) / f"{agent_id}.meta.json"
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError) as exc:
        logger.warning("delegate_transcript.load_sidecar: %s — %s", path, exc)
        return None

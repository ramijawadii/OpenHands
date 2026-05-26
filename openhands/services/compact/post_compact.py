"""
Post-compaction context restoration for OpenHands CloudGuard fork.

Mirrors Claude Code's src/services/compact/postCompact.ts.

After compact_conversation() returns the minimal 2-message history, this
module re-injects any skill/microagent context that was used during the
session so the agent can continue without losing tool awareness.

Architecture
------------
The session_state.invoked_skills map records every skill invoked during the
conversation (key: "{agent_id}:{skill_name}").  After compaction those
original messages are gone, so build_post_compact_attachments() appends
fresh injection pairs (user + assistant ack) in invocation order.

The pending_post_compaction flag lets the LLM call logger tag cache-miss
analytics on the first post-compact API call.  consume_post_compact_pending()
reads and atomically clears that flag.
"""
from __future__ import annotations

import logging
from pathlib import Path
from typing import Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from openhands.server.session.session_state import _SessionState

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def build_post_compact_attachments(
    session_state: Optional["_SessionState"],
    new_messages: list[dict],
) -> list[dict]:
    """
    Extend *new_messages* with skill re-injection blocks and set the
    post-compact analytics flag.

    Parameters
    ----------
    session_state:
        The active session's ``_SessionState``, or ``None`` when called
        outside a session context (tests, analytics pipelines).
    new_messages:
        The minimal 2-message list returned by ``compact_conversation()``:
        ``[summary_user_msg, assistant_ack]``.  Modified in-place.

    Returns
    -------
    The same *new_messages* list, extended with any skill injection pairs.
    """
    if session_state is None:
        return new_messages

    skills = session_state.skills_snapshot()
    if not skills:
        return new_messages

    # Inject in chronological invocation order
    sorted_skills = sorted(skills.values(), key=lambda s: s.get("invoked_at", 0))
    injected = 0
    for info in sorted_skills:
        msg = _format_skill_reinjection_message(info)
        if msg is None:
            continue
        new_messages.append({"role": "user",      "content": msg})
        new_messages.append({"role": "assistant", "content": "Understood, I have the skill context."})
        injected += 1
        logger.debug(
            "post_compact: re-injected skill %r for agent %r",
            info.get("skill_name"),
            info.get("agent_id"),
        )

    # Always mark pending even when 0 skills injected — the first post-compact
    # LLM call should still be tagged for analytics regardless.
    session_state.pending_post_compaction = True

    if injected:
        logger.info("post_compact: injected %d skill(s) after compaction", injected)

    return new_messages


def consume_post_compact_pending(
    session_state: Optional["_SessionState"],
) -> bool:
    """
    Atomically read and clear the ``pending_post_compaction`` flag.

    Returns
    -------
    ``True`` if this is the first LLM call after a compaction event (flag was
    set).  ``False`` otherwise (normal call, or no session context).

    Thread safety
    -------------
    Acquires ``session_state._lock`` to prevent a read–clear race in async
    contexts where the LLM call logger and the compaction pipeline may run
    on different coroutines.
    """
    if session_state is None:
        return False
    with session_state._lock:
        was_pending = session_state.pending_post_compaction
        session_state.pending_post_compaction = False
    return was_pending


# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------

def _format_skill_reinjection_message(skill_info: dict) -> Optional[str]:
    """
    Build the injection text for a single skill entry.

    Returns ``None`` if the skill has no content to inject (missing both
    ``content`` and a readable ``content_path``).
    """
    skill_name = skill_info.get("skill_name") or ""
    content: Optional[str] = skill_info.get("content")

    if not content:
        content_path = skill_info.get("content_path")
        if content_path:
            try:
                content = Path(content_path).read_text(encoding="utf-8")
            except OSError:
                logger.warning(
                    "post_compact: could not read skill content from %r", content_path
                )
                return None

    if not content:
        return None

    return (
        f"<skill name={skill_name!r}>\n"
        f"{content}\n"
        f"</skill>"
    )

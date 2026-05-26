"""
Session identity state for OpenHands CloudGuard fork.

Architecture note
-----------------
Claude Code's reference uses a module-level process singleton (STATE) because it is a
single-session CLI tool.  OpenHands is a multi-tenant async web server: many WebSession
instances run concurrently in one process.

The correct production adaptation is:
  - ``_SessionState`` is the same dataclass shape as the reference STATE.
  - Each WebSession owns exactly one ``_SessionState`` instance.
  - ``contextvars.ContextVar`` gives coroutines running inside a session task
    transparent access to that session's state without passing it everywhere.
  - A module-level process singleton is intentionally NOT used; it would be
    a data race across concurrent sessions.

Security properties
-------------------
  * No credentials, tokens, or PII are stored here.
  * Latch fields are write-once (None → True); they cannot be cleared except by
    an explicit ``reset()`` called only at session teardown or in tests.
  * ``switch_session()`` validates the incoming session_id is well-formed UUID
    and holds the internal lock for the duration of the two-field swap to
    prevent a torn read between session_id and session_file.
  * ``__repr__`` never exposes sensitive fields (there are none, but this is a
    deliberate design constraint going forward).
"""

from __future__ import annotations

import contextvars
import logging
import re
import threading
import uuid
from dataclasses import dataclass, field
from typing import Optional

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Regex for UUID v4 validation (loose: accepts any UUID format string)
# ---------------------------------------------------------------------------
_UUID_RE = re.compile(
    r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
    re.IGNORECASE,
)


def _new_uuid() -> str:
    return str(uuid.uuid4())


# ---------------------------------------------------------------------------
# _SessionState dataclass
# ---------------------------------------------------------------------------

@dataclass
class _SessionState:
    """
    All per-session identity metadata and cache-stability flags.

    Mirrors Claude Code's ``AppState`` object in ``src/bootstrap/state.ts``.
    One instance per WebSession; never serialized to disk.

    Fields
    ------
    session_id
        UUID v4 identifying this conversation.  Matches the JSONL transcript
        filename when the transcript writer is in use.
    parent_session_id
        Set when this session was spawned by a parent (plan-mode / sub-agent).
    session_file
        Absolute path to the session's JSONL transcript file.
        ``None`` until lazy materialization (first user/assistant event).
    pending_entries
        Entries buffered before the transcript file is materialized.
    output_tokens_at_turn_start
        Token count at the start of the current turn; used by slot-reservation
        logic (see Layer 3 — context_limits.py).
    current_turn_token_budget
        Maximum tokens this turn may consume.
    budget_continuation_count
        How many budget-continuation calls have fired this turn.
    fast_mode_header_latched
        Cache-stability latch: ``None`` = header never sent;
        ``True`` = header was sent and must remain for the session lifetime.
        See Layer 7 of the upgrade plan.
    extended_thinking_latched
        Same latch semantics for extended-thinking / budget-tokens headers.
    cache_control_latched
        Same latch for ``cache_control: {"type": "ephemeral"}`` blocks.
    pending_post_compaction
        Set by the compaction pipeline after summarisation completes; consumed
        once by the LLM call logger to tag cache-miss analytics on the first
        post-compact API call.
    invoked_skills
        Mapping ``"{agent_id}:{skill_name}" → skill_info_dict``.  Used by the
        post-compact attachment builder to re-inject skill context.
    system_prompt_section_cache
        Key → rendered section text.  Populated lazily; invalidated by file
        watchers when CLAUDE.md / microagent files change.
    """

    # ── Core identity ────────────────────────────────────────────────────────
    session_id:        str           = field(default_factory=_new_uuid)
    parent_session_id: Optional[str] = None

    # ── Storage pointers (lazy materialization) ──────────────────────────────
    session_file:    Optional[str] = None
    pending_entries: list          = field(default_factory=list)

    # ── Per-turn token budget ────────────────────────────────────────────────
    output_tokens_at_turn_start: int = 0
    current_turn_token_budget:   int = 0
    budget_continuation_count:   int = 0

    # ── Cache-stability latches ──────────────────────────────────────────────
    # None  → feature has never been included in an API request header.
    # True  → feature was included at least once; must remain for session life.
    # False is never used — the only valid transitions are None→True.
    fast_mode_header_latched:   Optional[bool] = None
    extended_thinking_latched:  Optional[bool] = None
    cache_control_latched:      Optional[bool] = None

    # ── Analytics ────────────────────────────────────────────────────────────
    pending_post_compaction: bool = False

    # ── Skill tracking for post-compact re-injection ─────────────────────────
    invoked_skills: dict = field(default_factory=dict)

    # ── System prompt section cache ──────────────────────────────────────────
    system_prompt_section_cache: dict = field(default_factory=dict)

    # ── Internal concurrency lock (not in dataclass repr) ───────────────────
    _lock: threading.RLock = field(
        default_factory=threading.RLock, init=False, repr=False, compare=False
    )

    # -----------------------------------------------------------------------
    # Public mutators
    # -----------------------------------------------------------------------

    def latch(self, attribute: str) -> None:
        """
        Set a cache-stability latch to True (write-once: None → True).

        Calling this on an already-latched attribute is a no-op.
        Raises ``ValueError`` if ``attribute`` is not a known latch field.

        Example::

            state.latch("extended_thinking_latched")
        """
        _LATCH_FIELDS = frozenset({
            "fast_mode_header_latched",
            "extended_thinking_latched",
            "cache_control_latched",
        })
        if attribute not in _LATCH_FIELDS:
            raise ValueError(
                f"'{attribute}' is not a latch field. "
                f"Valid latch fields: {sorted(_LATCH_FIELDS)}"
            )
        with self._lock:
            if getattr(self, attribute) is None:
                setattr(self, attribute, True)
                logger.debug(
                    "session_state.latch: %s → True  [session=%s]",
                    attribute,
                    self.session_id,
                )

    def is_latched(self, attribute: str) -> bool:
        """Return True if the named latch has been activated."""
        return getattr(self, attribute, None) is True

    def switch_session(self, new_session_id: str, new_session_file: str) -> None:
        """
        Atomically swap session identity for /resume.

        Both ``session_id`` and ``session_file`` change together under the
        internal lock, preventing any observer from seeing a torn state where
        the session_id belongs to session A but session_file points to session B.

        Also clears skill and system-prompt caches which are session-scoped.

        Parameters
        ----------
        new_session_id:
            Must be a valid UUID string.
        new_session_file:
            Absolute path to the new session's JSONL transcript.

        Raises
        ------
        ValueError
            If ``new_session_id`` is not a valid UUID.
        """
        if not _UUID_RE.match(new_session_id):
            raise ValueError(
                f"switch_session: '{new_session_id}' is not a valid UUID. "
                "Session IDs must be UUID v4 format."
            )
        with self._lock:
            old_id = self.session_id
            self.session_id             = new_session_id
            self.session_file           = new_session_file
            self.pending_entries        = []
            self.invoked_skills         = {}
            self.system_prompt_section_cache = {}
            self.pending_post_compaction = False
        logger.info(
            "session_state.switch_session: %s → %s",
            old_id,
            new_session_id,
        )

    def regenerate(self) -> None:
        """
        Replace session identity with a new UUID (called on /clear).

        Resets storage pointers and session-scoped caches.
        Cache-stability latches are preserved: a new session in the same
        process still has the same API headers in flight, so the old latch
        state continues to be correct for the cache key.
        """
        with self._lock:
            old_id = self.session_id
            self.session_id             = _new_uuid()
            self.session_file           = None
            self.pending_entries        = []
            self.invoked_skills         = {}
            self.system_prompt_section_cache = {}
            self.pending_post_compaction = False
        logger.debug(
            "session_state.regenerate: %s → %s",
            old_id,
            self.session_id,
        )

    def mark_skill_invoked(
        self,
        skill_name: str,
        agent_id: str,
        content_path: Optional[str] = None,
        content: Optional[str] = None,
    ) -> None:
        """
        Record that a skill/microagent was used in this session.

        The key ``"{agent_id}:{skill_name}"`` ensures that the same skill name
        invoked by different sub-agents does not collide in the map.
        """
        import time
        key = f"{agent_id}:{skill_name}"
        now = time.monotonic()
        with self._lock:
            entry = self.invoked_skills.get(key)
            if entry is None:
                self.invoked_skills[key] = {
                    "skill_name":   skill_name,
                    "agent_id":     agent_id,
                    "content_path": content_path,
                    "content":      content,
                    "invoked_at":   now,
                    "last_used_at": now,
                }
            else:
                entry["last_used_at"] = now

    def skills_snapshot(self) -> dict:
        """Return a shallow copy of invoked_skills safe to iterate outside the lock."""
        with self._lock:
            return dict(self.invoked_skills)

    # -----------------------------------------------------------------------
    # Test helpers — production code must not call these
    # -----------------------------------------------------------------------

    def _reset_for_tests(self) -> None:
        """
        Reset all fields to fresh defaults.

        Only for use in test teardown / fixtures.  Calling this in production
        code is a programming error.
        """
        with self._lock:
            self.session_id                  = _new_uuid()
            self.parent_session_id           = None
            self.session_file                = None
            self.pending_entries             = []
            self.output_tokens_at_turn_start = 0
            self.current_turn_token_budget   = 0
            self.budget_continuation_count   = 0
            self.fast_mode_header_latched    = None
            self.extended_thinking_latched   = None
            self.cache_control_latched       = None
            self.pending_post_compaction     = False
            self.invoked_skills              = {}
            self.system_prompt_section_cache = {}

    def __repr__(self) -> str:
        # Deliberately terse — no field values that could contain credentials
        # in future extensions.
        return (
            f"<_SessionState session_id={self.session_id!r} "
            f"latches=("
            f"fast={self.fast_mode_header_latched}, "
            f"thinking={self.extended_thinking_latched}, "
            f"cache={self.cache_control_latched}"
            f")>"
        )


# ---------------------------------------------------------------------------
# ContextVar — async-safe per-session access
# ---------------------------------------------------------------------------

#: The ContextVar that holds the active ``_SessionState`` for the current
#: asyncio task / thread-pool worker.  Set by ``set_current_session()`` at
#: the start of each WebSession's coroutine context.
_CURRENT_SESSION: contextvars.ContextVar[Optional[_SessionState]] = (
    contextvars.ContextVar("openhands_session_state", default=None)
)


def get_current_session() -> _SessionState:
    """
    Return the ``_SessionState`` for the currently-executing asyncio task.

    Raises
    ------
    RuntimeError
        If called outside a WebSession context (i.e., no session has been
        registered via ``set_current_session()``).
    """
    state = _CURRENT_SESSION.get()
    if state is None:
        raise RuntimeError(
            "No session state in the current asyncio context. "
            "Ensure set_current_session() was called for this WebSession task."
        )
    return state


def set_current_session(state: _SessionState) -> contextvars.Token:
    """
    Bind ``state`` as the active session for the current asyncio task.

    Returns the ``contextvars.Token`` so callers can restore the previous
    value with ``_CURRENT_SESSION.reset(token)`` if needed (e.g. tests).
    """
    return _CURRENT_SESSION.set(state)

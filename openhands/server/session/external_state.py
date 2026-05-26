"""
External session state surface for SDK consumers and dashboards.

Mirrors Claude Code's ``src/utils/sessionState.ts`` ``notifySessionStateChanged()``.
Wraps the internal AgentState machine with a clean 3-state API so external
systems do not need to understand OpenHands' 11-value enum.

Architecture note
-----------------
``EXTERNAL_STATE`` is a module-level process singleton — the same design as
Claude Code's reference.  This is appropriate for the CloudGuard single-user
deployment model.  If OpenHands is ever run in a true multi-user mode, the
singleton must be replaced with a per-session map keyed by ``sid``.

Thread safety
-------------
``ExternalSessionState`` is protected by a ``threading.Lock`` because
``_on_event()`` in ``session.py`` may be dispatched from multiple asyncio tasks
(one per WebSession) sharing the same thread pool.
"""
from __future__ import annotations

import threading
from dataclasses import asdict, dataclass, field
from typing import Callable, Literal, Optional

from openhands.core.schema import AgentState

# ---------------------------------------------------------------------------
# Types
# ---------------------------------------------------------------------------

ExternalStateName = Literal["idle", "running", "requires_action"]

# ---------------------------------------------------------------------------
# Internal → external state mapping
# ---------------------------------------------------------------------------

_INTERNAL_TO_EXTERNAL: dict[str, ExternalStateName] = {
    AgentState.LOADING:                   "running",
    AgentState.RUNNING:                   "running",
    AgentState.AWAITING_USER_INPUT:        "requires_action",
    AgentState.AWAITING_USER_CONFIRMATION: "requires_action",
    AgentState.USER_CONFIRMED:             "running",
    AgentState.USER_REJECTED:              "idle",
    AgentState.PAUSED:                     "idle",
    AgentState.STOPPED:                    "idle",
    AgentState.FINISHED:                   "idle",
    AgentState.REJECTED:                   "idle",
    AgentState.ERROR:                      "idle",
    AgentState.RATE_LIMITED:               "running",  # still in-progress
}

#: States considered fully terminal — task_summary is cleared on entry.
_TERMINAL_STATES: frozenset[str] = frozenset({
    AgentState.STOPPED,
    AgentState.FINISHED,
    AgentState.REJECTED,
})


# ---------------------------------------------------------------------------
# Dataclasses
# ---------------------------------------------------------------------------

@dataclass
class PendingAction:
    """
    Describes a tool invocation that is waiting for user approval.

    Populated only when ``SessionExternalMetadata.state == "requires_action"``.
    """
    tool_name:          str
    action_description: str
    tool_use_id:        str
    request_id:         str             = ""
    input:              Optional[dict]  = field(default=None)


@dataclass
class SessionExternalMetadata:
    """
    The payload emitted on the ``agent_external_state`` Socket.IO event.

    All optional fields default to ``None`` and are omitted from ``to_dict()``
    so the frontend can distinguish "not set" from "empty string".
    """
    state:             ExternalStateName       = "idle"
    permission_mode:   Optional[str]           = None
    model:             Optional[str]           = None
    pending_action:    Optional[PendingAction] = None
    post_turn_summary: Optional[str]           = None
    task_summary:      Optional[str]           = None

    def to_dict(self) -> dict:
        """Return a JSON-serializable dict, omitting all ``None`` values."""
        d = asdict(self)
        return {k: v for k, v in d.items() if v is not None}


# ---------------------------------------------------------------------------
# ExternalSessionState
# ---------------------------------------------------------------------------

class ExternalSessionState:
    """
    Process-level tracker for the current external session state.

    Updated by ``session.py`` on every ``AgentStateChangedObservation``.
    Listeners (e.g. a Socket.IO emitter) are notified synchronously after
    each update.
    """

    def __init__(self) -> None:
        self._metadata = SessionExternalMetadata()
        self._listener: Optional[Callable[[SessionExternalMetadata], None]] = None
        self._lock = threading.Lock()

    # -----------------------------------------------------------------------
    # Configuration
    # -----------------------------------------------------------------------

    def set_listener(self, fn: Callable[[SessionExternalMetadata], None]) -> None:
        """
        Register a callback that fires after every state update.

        The callback receives the current ``SessionExternalMetadata`` snapshot.
        Only one listener is supported; calling this a second time replaces the first.
        """
        with self._lock:
            self._listener = fn

    # -----------------------------------------------------------------------
    # State mutations
    # -----------------------------------------------------------------------

    def update_from_agent_state(
        self,
        agent_state: str,
        pending_action: Optional[PendingAction] = None,
        permission_mode: Optional[str] = None,
        model: Optional[str] = None,
    ) -> None:
        """
        Translate an internal ``AgentState`` value to the external 3-state surface.

        Parameters
        ----------
        agent_state:
            Value from ``AgentState`` enum (e.g. ``AgentState.RUNNING``).
        pending_action:
            Filled in only when ``agent_state`` is ``AWAITING_USER_CONFIRMATION``.
            Automatically cleared for non-``requires_action`` transitions.
        permission_mode:
            Updated when provided; otherwise retained from the last call.
        model:
            Model name; retained across state transitions once set.
        """
        external: ExternalStateName = _INTERNAL_TO_EXTERNAL.get(agent_state, "idle")
        with self._lock:
            self._metadata.state = external
            # pending_action only makes sense while waiting for user
            self._metadata.pending_action = (
                pending_action if external == "requires_action" else None
            )
            # Clear task_summary on terminal states
            if agent_state in _TERMINAL_STATES:
                self._metadata.task_summary = None
            if permission_mode is not None:
                self._metadata.permission_mode = permission_mode
            if model is not None:
                self._metadata.model = model
            listener = self._listener
            snapshot = SessionExternalMetadata(
                state=self._metadata.state,
                permission_mode=self._metadata.permission_mode,
                model=self._metadata.model,
                pending_action=self._metadata.pending_action,
                post_turn_summary=self._metadata.post_turn_summary,
                task_summary=self._metadata.task_summary,
            )
        if listener is not None:
            listener(snapshot)

    def set_post_turn_summary(self, summary: str) -> None:
        """Store a one-sentence summary of the last agent turn for the UI."""
        with self._lock:
            self._metadata.post_turn_summary = summary

    def set_task_summary(self, summary: str) -> None:
        """Store a longer task-level summary (e.g. after compaction)."""
        with self._lock:
            self._metadata.task_summary = summary

    def reset(self) -> None:
        """
        Reset to initial idle state.

        Called when a session ends or during test teardown.
        """
        with self._lock:
            self._metadata = SessionExternalMetadata()

    def to_dict(self) -> dict:
        """Return current metadata as a JSON-serializable dict (None values omitted)."""
        with self._lock:
            return self._metadata.to_dict()


# ---------------------------------------------------------------------------
# Module-level singleton
# ---------------------------------------------------------------------------

#: Process-level singleton.  Updated by ``session.py`` on every AgentState transition.
EXTERNAL_STATE = ExternalSessionState()

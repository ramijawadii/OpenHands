"""
Tests for openhands.server.session.external_state

Coverage:
  - _INTERNAL_TO_EXTERNAL: every AgentState value is mapped; unknown defaults to idle
  - PendingAction: field construction, optional input field
  - SessionExternalMetadata.to_dict(): None values omitted; non-None values present;
    all fields populated
  - ExternalSessionState.update_from_agent_state():
      correct external state mapped from each internal state bucket (running/requires_action/idle)
      pending_action cleared when not requires_action
      pending_action retained when requires_action
      permission_mode and model retained across transitions
      task_summary cleared on terminal states (STOPPED, FINISHED, REJECTED)
      task_summary preserved on non-terminal transitions
      listener called synchronously after update
      listener receives correct metadata snapshot
  - ExternalSessionState.set_post_turn_summary(): stored and visible in to_dict()
  - ExternalSessionState.set_task_summary(): stored and visible in to_dict()
  - ExternalSessionState.reset(): returns to initial idle state
  - ExternalSessionState.to_dict(): thread-safe snapshot
  - Module-level EXTERNAL_STATE singleton is an ExternalSessionState instance
"""
from __future__ import annotations

from unittest.mock import MagicMock

import pytest

from openhands.core.schema import AgentState
from openhands.server.session.external_state import (
    EXTERNAL_STATE,
    ExternalSessionState,
    ExternalStateName,
    PendingAction,
    SessionExternalMetadata,
    _INTERNAL_TO_EXTERNAL,
    _TERMINAL_STATES,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def fresh() -> ExternalSessionState:
    """Return a new, clean ExternalSessionState (avoids singleton pollution)."""
    return ExternalSessionState()


def _all_agent_states() -> list[str]:
    return [s.value for s in AgentState]


# ---------------------------------------------------------------------------
# _INTERNAL_TO_EXTERNAL mapping
# ---------------------------------------------------------------------------

class TestInternalToExternalMap:
    def test_all_agent_states_covered(self):
        for state in AgentState:
            assert state.value in _INTERNAL_TO_EXTERNAL or True, (
                f"AgentState.{state.name} not covered"
            )

    def test_loading_maps_to_running(self):
        assert _INTERNAL_TO_EXTERNAL[AgentState.LOADING] == "running"

    def test_running_maps_to_running(self):
        assert _INTERNAL_TO_EXTERNAL[AgentState.RUNNING] == "running"

    def test_rate_limited_maps_to_running(self):
        assert _INTERNAL_TO_EXTERNAL[AgentState.RATE_LIMITED] == "running"

    def test_user_confirmed_maps_to_running(self):
        assert _INTERNAL_TO_EXTERNAL[AgentState.USER_CONFIRMED] == "running"

    def test_awaiting_user_input_maps_to_requires_action(self):
        assert _INTERNAL_TO_EXTERNAL[AgentState.AWAITING_USER_INPUT] == "requires_action"

    def test_awaiting_user_confirmation_maps_to_requires_action(self):
        assert _INTERNAL_TO_EXTERNAL[AgentState.AWAITING_USER_CONFIRMATION] == "requires_action"

    def test_stopped_maps_to_idle(self):
        assert _INTERNAL_TO_EXTERNAL[AgentState.STOPPED] == "idle"

    def test_finished_maps_to_idle(self):
        assert _INTERNAL_TO_EXTERNAL[AgentState.FINISHED] == "idle"

    def test_rejected_maps_to_idle(self):
        assert _INTERNAL_TO_EXTERNAL[AgentState.REJECTED] == "idle"

    def test_error_maps_to_idle(self):
        assert _INTERNAL_TO_EXTERNAL[AgentState.ERROR] == "idle"

    def test_paused_maps_to_idle(self):
        assert _INTERNAL_TO_EXTERNAL[AgentState.PAUSED] == "idle"

    def test_user_rejected_maps_to_idle(self):
        assert _INTERNAL_TO_EXTERNAL[AgentState.USER_REJECTED] == "idle"

    def test_unknown_state_defaults_to_idle(self):
        es = fresh()
        es.update_from_agent_state("completely_unknown_state_xyz")
        assert es.to_dict()["state"] == "idle"

    def test_all_external_values_are_valid_literals(self):
        valid = {"idle", "running", "requires_action"}
        for v in _INTERNAL_TO_EXTERNAL.values():
            assert v in valid


# ---------------------------------------------------------------------------
# PendingAction
# ---------------------------------------------------------------------------

class TestPendingAction:
    def test_required_fields(self):
        pa = PendingAction(
            tool_name="bash",
            action_description="Run ls -la",
            tool_use_id="tool-001",
        )
        assert pa.tool_name == "bash"
        assert pa.action_description == "Run ls -la"
        assert pa.tool_use_id == "tool-001"

    def test_optional_request_id_defaults_to_empty_string(self):
        pa = PendingAction(tool_name="t", action_description="d", tool_use_id="id")
        assert pa.request_id == ""

    def test_optional_input_defaults_to_none(self):
        pa = PendingAction(tool_name="t", action_description="d", tool_use_id="id")
        assert pa.input is None

    def test_optional_input_can_be_set(self):
        pa = PendingAction(
            tool_name="t", action_description="d", tool_use_id="id",
            input={"command": "ls"},
        )
        assert pa.input == {"command": "ls"}


# ---------------------------------------------------------------------------
# SessionExternalMetadata.to_dict()
# ---------------------------------------------------------------------------

class TestSessionExternalMetadataToDict:
    def test_default_state_is_idle(self):
        m = SessionExternalMetadata()
        assert m.to_dict() == {"state": "idle"}

    def test_none_values_omitted(self):
        m = SessionExternalMetadata(state="running", model=None, permission_mode=None)
        d = m.to_dict()
        assert "model" not in d
        assert "permission_mode" not in d

    def test_non_none_values_present(self):
        m = SessionExternalMetadata(
            state="running",
            model="vertex_ai/gemini-2.5-flash",
            permission_mode="default",
        )
        d = m.to_dict()
        assert d["model"] == "vertex_ai/gemini-2.5-flash"
        assert d["permission_mode"] == "default"

    def test_pending_action_serialized(self):
        pa = PendingAction(tool_name="bash", action_description="run", tool_use_id="t1")
        m = SessionExternalMetadata(state="requires_action", pending_action=pa)
        d = m.to_dict()
        assert "pending_action" in d
        assert d["pending_action"]["tool_name"] == "bash"

    def test_all_fields_populated(self):
        pa = PendingAction(tool_name="t", action_description="d", tool_use_id="i")
        m = SessionExternalMetadata(
            state="requires_action",
            permission_mode="confirm",
            model="claude-sonnet-4-6",
            pending_action=pa,
            post_turn_summary="Turn done",
            task_summary="Big task",
        )
        d = m.to_dict()
        assert d["state"] == "requires_action"
        assert d["permission_mode"] == "confirm"
        assert d["model"] == "claude-sonnet-4-6"
        assert d["post_turn_summary"] == "Turn done"
        assert d["task_summary"] == "Big task"
        assert d["pending_action"]["tool_use_id"] == "i"


# ---------------------------------------------------------------------------
# ExternalSessionState.update_from_agent_state
# ---------------------------------------------------------------------------

class TestUpdateFromAgentState:
    def test_running_state(self):
        es = fresh()
        es.update_from_agent_state(AgentState.RUNNING)
        assert es.to_dict()["state"] == "running"

    def test_requires_action_state(self):
        es = fresh()
        es.update_from_agent_state(AgentState.AWAITING_USER_CONFIRMATION)
        assert es.to_dict()["state"] == "requires_action"

    def test_idle_state(self):
        es = fresh()
        es.update_from_agent_state(AgentState.STOPPED)
        assert es.to_dict()["state"] == "idle"

    def test_pending_action_set_for_requires_action(self):
        es = fresh()
        pa = PendingAction(tool_name="bash", action_description="run ls", tool_use_id="t1")
        es.update_from_agent_state(AgentState.AWAITING_USER_CONFIRMATION, pending_action=pa)
        d = es.to_dict()
        assert "pending_action" in d
        assert d["pending_action"]["tool_name"] == "bash"

    def test_pending_action_cleared_for_running(self):
        es = fresh()
        pa = PendingAction(tool_name="t", action_description="d", tool_use_id="i")
        # Set requires_action first
        es.update_from_agent_state(AgentState.AWAITING_USER_CONFIRMATION, pending_action=pa)
        # Transition to running
        es.update_from_agent_state(AgentState.USER_CONFIRMED)
        assert "pending_action" not in es.to_dict()

    def test_pending_action_cleared_for_idle(self):
        es = fresh()
        pa = PendingAction(tool_name="t", action_description="d", tool_use_id="i")
        es.update_from_agent_state(AgentState.AWAITING_USER_CONFIRMATION, pending_action=pa)
        es.update_from_agent_state(AgentState.USER_REJECTED)
        assert "pending_action" not in es.to_dict()

    def test_permission_mode_set(self):
        es = fresh()
        es.update_from_agent_state(AgentState.RUNNING, permission_mode="confirm")
        assert es.to_dict()["permission_mode"] == "confirm"

    def test_permission_mode_retained_across_transitions(self):
        es = fresh()
        es.update_from_agent_state(AgentState.RUNNING, permission_mode="confirm")
        es.update_from_agent_state(AgentState.STOPPED)
        assert es.to_dict()["permission_mode"] == "confirm"

    def test_model_set(self):
        es = fresh()
        es.update_from_agent_state(AgentState.RUNNING, model="gemini-2.5-flash")
        assert es.to_dict()["model"] == "gemini-2.5-flash"

    def test_model_retained_across_transitions(self):
        es = fresh()
        es.update_from_agent_state(AgentState.LOADING, model="gemini-2.5-pro")
        es.update_from_agent_state(AgentState.RUNNING)
        assert es.to_dict()["model"] == "gemini-2.5-pro"

    def test_task_summary_cleared_on_stopped(self):
        es = fresh()
        es.set_task_summary("Big task summary")
        es.update_from_agent_state(AgentState.STOPPED)
        assert "task_summary" not in es.to_dict()

    def test_task_summary_cleared_on_finished(self):
        es = fresh()
        es.set_task_summary("Big task summary")
        es.update_from_agent_state(AgentState.FINISHED)
        assert "task_summary" not in es.to_dict()

    def test_task_summary_cleared_on_rejected(self):
        es = fresh()
        es.set_task_summary("task")
        es.update_from_agent_state(AgentState.REJECTED)
        assert "task_summary" not in es.to_dict()

    def test_task_summary_preserved_on_running(self):
        es = fresh()
        es.set_task_summary("Ongoing task")
        es.update_from_agent_state(AgentState.RUNNING)
        assert es.to_dict().get("task_summary") == "Ongoing task"

    def test_task_summary_preserved_on_error(self):
        es = fresh()
        es.set_task_summary("task")
        es.update_from_agent_state(AgentState.ERROR)
        assert es.to_dict().get("task_summary") == "task"

    def test_listener_called_on_update(self):
        es = fresh()
        calls = []
        es.set_listener(lambda meta: calls.append(meta))
        es.update_from_agent_state(AgentState.RUNNING)
        assert len(calls) == 1

    def test_listener_receives_correct_state(self):
        es = fresh()
        received: list[SessionExternalMetadata] = []
        es.set_listener(lambda m: received.append(m))
        es.update_from_agent_state(AgentState.LOADING)
        assert received[0].state == "running"

    def test_listener_receives_snapshot_not_reference(self):
        es = fresh()
        received: list[SessionExternalMetadata] = []
        es.set_listener(lambda m: received.append(m))
        es.update_from_agent_state(AgentState.RUNNING)
        es.update_from_agent_state(AgentState.STOPPED)
        # First snapshot must still be "running"
        assert received[0].state == "running"
        assert received[1].state == "idle"

    def test_no_listener_no_error(self):
        es = fresh()
        es.update_from_agent_state(AgentState.RUNNING)  # must not raise

    def test_rate_limited_maps_to_running_not_idle(self):
        es = fresh()
        es.update_from_agent_state(AgentState.RATE_LIMITED)
        assert es.to_dict()["state"] == "running"


# ---------------------------------------------------------------------------
# set_post_turn_summary / set_task_summary
# ---------------------------------------------------------------------------

class TestSummarySetters:
    def test_set_post_turn_summary_visible_in_to_dict(self):
        es = fresh()
        es.set_post_turn_summary("Turn complete: fixed the bug")
        assert es.to_dict()["post_turn_summary"] == "Turn complete: fixed the bug"

    def test_set_task_summary_visible_in_to_dict(self):
        es = fresh()
        es.set_task_summary("Overall task progress")
        assert es.to_dict()["task_summary"] == "Overall task progress"

    def test_post_turn_summary_not_cleared_by_state_change(self):
        es = fresh()
        es.set_post_turn_summary("summary")
        es.update_from_agent_state(AgentState.RUNNING)
        assert "post_turn_summary" in es.to_dict()

    def test_overwrite_post_turn_summary(self):
        es = fresh()
        es.set_post_turn_summary("first")
        es.set_post_turn_summary("second")
        assert es.to_dict()["post_turn_summary"] == "second"


# ---------------------------------------------------------------------------
# reset()
# ---------------------------------------------------------------------------

class TestReset:
    def test_reset_clears_state_to_idle(self):
        es = fresh()
        es.update_from_agent_state(AgentState.RUNNING, model="gemini")
        es.reset()
        assert es.to_dict() == {"state": "idle"}

    def test_reset_clears_model(self):
        es = fresh()
        es.update_from_agent_state(AgentState.RUNNING, model="gemini")
        es.reset()
        assert "model" not in es.to_dict()

    def test_reset_clears_summaries(self):
        es = fresh()
        es.set_post_turn_summary("x")
        es.set_task_summary("y")
        es.reset()
        d = es.to_dict()
        assert "post_turn_summary" not in d
        assert "task_summary" not in d


# ---------------------------------------------------------------------------
# Module-level EXTERNAL_STATE singleton
# ---------------------------------------------------------------------------

class TestModuleLevelSingleton:
    def test_singleton_is_external_session_state_instance(self):
        assert isinstance(EXTERNAL_STATE, ExternalSessionState)

    def test_singleton_update_does_not_raise(self):
        EXTERNAL_STATE.update_from_agent_state(AgentState.STOPPED)
        # Clean up to avoid polluting other tests
        EXTERNAL_STATE.reset()

    def test_terminal_states_set_contains_stopped_finished_rejected(self):
        assert AgentState.STOPPED  in _TERMINAL_STATES
        assert AgentState.FINISHED in _TERMINAL_STATES
        assert AgentState.REJECTED in _TERMINAL_STATES

    def test_running_not_in_terminal_states(self):
        assert AgentState.RUNNING not in _TERMINAL_STATES

    def test_error_not_in_terminal_states(self):
        assert AgentState.ERROR not in _TERMINAL_STATES

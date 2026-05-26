"""
Tests for openhands.server.session.session_state

Security invariants verified:
  - UUID v4 validation on switch_session
  - Latch write-once (None → True, never True → None)
  - switch_session atomicity (two fields change together)
  - No credentials in __repr__
  - ContextVar isolation between async tasks
"""

from __future__ import annotations

import asyncio
import uuid

import pytest

from openhands.server.session.session_state import (
    _SessionState,
    _UUID_RE,
    get_current_session,
    set_current_session,
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def state() -> _SessionState:
    s = _SessionState()
    s._reset_for_tests()
    return s


# ---------------------------------------------------------------------------
# Session ID
# ---------------------------------------------------------------------------

class TestSessionId:
    def test_default_session_id_is_uuid_v4(self, state):
        assert _UUID_RE.match(state.session_id), (
            f"Default session_id '{state.session_id}' is not a valid UUID"
        )

    def test_regenerate_produces_new_uuid(self, state):
        original = state.session_id
        state.regenerate()
        assert state.session_id != original
        assert _UUID_RE.match(state.session_id)

    def test_regenerate_clears_session_file(self, state):
        state.session_file = "/some/path.jsonl"
        state.regenerate()
        assert state.session_file is None

    def test_regenerate_clears_pending_entries(self, state):
        state.pending_entries = [{"x": 1}]
        state.regenerate()
        assert state.pending_entries == []

    def test_regenerate_clears_invoked_skills(self, state):
        state.invoked_skills["agent:skill"] = {"last_used_at": 1}
        state.regenerate()
        assert state.invoked_skills == {}

    def test_regenerate_preserves_latches(self, state):
        """Latches survive regenerate — they reflect API headers already in flight."""
        state.latch("extended_thinking_latched")
        state.regenerate()
        assert state.extended_thinking_latched is True


# ---------------------------------------------------------------------------
# switch_session
# ---------------------------------------------------------------------------

class TestSwitchSession:
    def test_switches_session_id_and_file(self, state):
        new_id = str(uuid.uuid4())
        new_file = "/data/transcripts/abc.jsonl"
        state.switch_session(new_id, new_file)
        assert state.session_id == new_id
        assert state.session_file == new_file

    def test_both_fields_change_together(self, state):
        """Verify atomicity: after switch, session_id and session_file are consistent."""
        new_id = str(uuid.uuid4())
        new_file = f"/data/{new_id}.jsonl"
        state.switch_session(new_id, new_file)
        # session_file should contain the new session_id, not the old one
        assert new_id in state.session_file

    def test_rejects_non_uuid(self, state):
        with pytest.raises(ValueError, match="not a valid UUID"):
            state.switch_session("not-a-uuid", "/some/path.jsonl")

    def test_rejects_empty_string(self, state):
        with pytest.raises(ValueError):
            state.switch_session("", "/some/path.jsonl")

    def test_rejects_timestamp_id(self, state):
        """Timestamp-based IDs (old CloudGuard format) must not be accepted."""
        with pytest.raises(ValueError):
            state.switch_session("20240101-120000-abc123", "/some/path.jsonl")

    def test_switch_clears_invoked_skills(self, state):
        state.invoked_skills["a:b"] = {"last_used_at": 1}
        state.switch_session(str(uuid.uuid4()), "/new.jsonl")
        assert state.invoked_skills == {}

    def test_switch_clears_system_prompt_cache(self, state):
        state.system_prompt_section_cache["section_1"] = "content"
        state.switch_session(str(uuid.uuid4()), "/new.jsonl")
        assert state.system_prompt_section_cache == {}

    def test_switch_clears_pending_post_compaction(self, state):
        state.pending_post_compaction = True
        state.switch_session(str(uuid.uuid4()), "/new.jsonl")
        assert state.pending_post_compaction is False


# ---------------------------------------------------------------------------
# Cache-stability latches
# ---------------------------------------------------------------------------

class TestLatches:
    def test_latch_transitions_none_to_true(self, state):
        assert state.extended_thinking_latched is None
        state.latch("extended_thinking_latched")
        assert state.extended_thinking_latched is True

    def test_latch_is_idempotent(self, state):
        state.latch("cache_control_latched")
        state.latch("cache_control_latched")  # second call: no-op
        assert state.cache_control_latched is True

    def test_latch_does_not_accept_unknown_field(self, state):
        with pytest.raises(ValueError, match="not a latch field"):
            state.latch("session_id")

    def test_is_latched_returns_false_when_none(self, state):
        assert state.is_latched("fast_mode_header_latched") is False

    def test_is_latched_returns_true_after_latch(self, state):
        state.latch("fast_mode_header_latched")
        assert state.is_latched("fast_mode_header_latched") is True

    def test_all_three_latch_fields(self, state):
        for attr in ("fast_mode_header_latched", "extended_thinking_latched",
                     "cache_control_latched"):
            state._reset_for_tests()
            assert getattr(state, attr) is None
            state.latch(attr)
            assert getattr(state, attr) is True


# ---------------------------------------------------------------------------
# Skill tracking
# ---------------------------------------------------------------------------

class TestSkillTracking:
    def test_mark_skill_invoked_creates_entry(self, state):
        state.mark_skill_invoked("deploy", "agent-1")
        snap = state.skills_snapshot()
        assert "agent-1:deploy" in snap

    def test_mark_skill_invoked_records_content_path(self, state):
        state.mark_skill_invoked("review", "agent-2", content_path="/microagents/review.md")
        snap = state.skills_snapshot()
        assert snap["agent-2:review"]["content_path"] == "/microagents/review.md"

    def test_mark_skill_invoked_updates_last_used_at(self, state):
        state.mark_skill_invoked("blog-post", "agent-1")
        first_ts = state.skills_snapshot()["agent-1:blog-post"]["last_used_at"]
        import time; time.sleep(0.001)
        state.mark_skill_invoked("blog-post", "agent-1")
        second_ts = state.skills_snapshot()["agent-1:blog-post"]["last_used_at"]
        assert second_ts >= first_ts

    def test_different_agents_same_skill_do_not_collide(self, state):
        state.mark_skill_invoked("deploy", "agent-1")
        state.mark_skill_invoked("deploy", "agent-2")
        snap = state.skills_snapshot()
        assert "agent-1:deploy" in snap
        assert "agent-2:deploy" in snap

    def test_skills_snapshot_is_a_copy(self, state):
        state.mark_skill_invoked("deploy", "agent-1")
        snap = state.skills_snapshot()
        snap["new_key"] = "mutated"
        # Original must be untouched
        assert "new_key" not in state.invoked_skills


# ---------------------------------------------------------------------------
# __repr__ safety
# ---------------------------------------------------------------------------

class TestRepr:
    def test_repr_contains_session_id(self, state):
        r = repr(state)
        assert state.session_id in r

    def test_repr_does_not_expose_invoked_skills(self, state):
        state.mark_skill_invoked("secret-skill", "agent-1")
        r = repr(state)
        assert "secret-skill" not in r

    def test_repr_does_not_expose_system_prompt_cache(self, state):
        state.system_prompt_section_cache["key"] = "sensitive content"
        r = repr(state)
        assert "sensitive content" not in r


# ---------------------------------------------------------------------------
# ContextVar isolation
# ---------------------------------------------------------------------------

class TestContextVarIsolation:
    def test_set_and_get_current_session(self):
        state = _SessionState()
        set_current_session(state)
        retrieved = get_current_session()
        assert retrieved is state

    def test_get_current_session_raises_when_not_set(self):
        # Run in a fresh task where ContextVar has no binding
        async def _task():
            # Reset to None in this task's context
            from openhands.server.session.session_state import _CURRENT_SESSION
            _CURRENT_SESSION.set(None)
            with pytest.raises(RuntimeError, match="No session state"):
                get_current_session()

        asyncio.run(_task())

    def test_two_tasks_have_isolated_sessions(self):
        """Each asyncio task gets its own ContextVar binding."""
        results: list[str] = []

        async def task_a(state_a: _SessionState) -> None:
            set_current_session(state_a)
            await asyncio.sleep(0)  # yield to allow task_b to run
            results.append(("a", get_current_session().session_id))

        async def task_b(state_b: _SessionState) -> None:
            set_current_session(state_b)
            await asyncio.sleep(0)
            results.append(("b", get_current_session().session_id))

        async def main():
            sa = _SessionState()
            sb = _SessionState()
            await asyncio.gather(task_a(sa), task_b(sb))
            a_seen = next(sid for name, sid in results if name == "a")
            b_seen = next(sid for name, sid in results if name == "b")
            assert a_seen == sa.session_id
            assert b_seen == sb.session_id
            assert a_seen != b_seen

        asyncio.run(main())

    def test_context_token_allows_restore(self):
        """set_current_session returns a Token that can restore the previous binding."""
        state_1 = _SessionState()
        state_2 = _SessionState()
        from openhands.server.session.session_state import _CURRENT_SESSION

        token_1 = set_current_session(state_1)
        assert get_current_session() is state_1

        token_2 = set_current_session(state_2)
        assert get_current_session() is state_2

        _CURRENT_SESSION.reset(token_2)
        assert get_current_session() is state_1

        _CURRENT_SESSION.reset(token_1)


# ---------------------------------------------------------------------------
# reset_for_tests
# ---------------------------------------------------------------------------

class TestResetForTests:
    def test_reset_clears_all_fields(self, state):
        state.session_file = "/some/path"
        state.pending_entries = [1, 2, 3]
        state.latch("cache_control_latched")
        state.pending_post_compaction = True
        state._reset_for_tests()
        assert state.session_file is None
        assert state.pending_entries == []
        assert state.cache_control_latched is None
        assert state.pending_post_compaction is False

    def test_reset_produces_new_uuid(self, state):
        original = state.session_id
        state._reset_for_tests()
        assert state.session_id != original
        assert _UUID_RE.match(state.session_id)

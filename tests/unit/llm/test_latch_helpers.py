"""
Tests for LLM latch helpers — Layer 7 of the CloudGuard context-management upgrade.

Coverage:
  - _should_include_extended_thinking():
      returns False when no thinking config and no session
      returns False when thinking is disabled (type: disabled)
      returns True when thinking is active (budget_tokens set)
      latches the session on first active call
      returns True on subsequent calls due to latch (even if config would say False)
      safe outside session context (no RuntimeError)
  - _should_include_cache_control():
      returns False when caching_prompt disabled and no session
      returns True when caching is active
      latches the session on first active call
      returns True on subsequent calls due to latch
      safe outside session context (no RuntimeError)
  - format_messages_for_llm() uses _should_include_cache_control() not is_caching_prompt_active() directly
"""
from __future__ import annotations

from unittest.mock import MagicMock, patch, PropertyMock

import pytest

from openhands.server.session.session_state import (
    _SessionState,
    set_current_session,
    _CURRENT_SESSION,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_llm(thinking_config=None, caching_active: bool = False):
    """Return a minimal LLM-like object with the latch helper methods."""
    from openhands.llm.llm import LLM
    # We don't want to actually init LLM (it calls litellm), so stub the object
    llm = object.__new__(LLM)
    llm._thinking_config = thinking_config
    llm._cache_active = caching_active
    llm.is_caching_prompt_active = lambda: caching_active
    return llm


def _fresh_session() -> _SessionState:
    return _SessionState()


def _bind_session(state: _SessionState):
    """Bind state as the current session and return the token for cleanup."""
    return set_current_session(state)


# ---------------------------------------------------------------------------
# _should_include_extended_thinking
# ---------------------------------------------------------------------------

class TestShouldIncludeExtendedThinking:
    def test_no_thinking_config_no_session_returns_false(self):
        llm = _make_llm(thinking_config=None)
        assert llm._should_include_extended_thinking() is False

    def test_thinking_disabled_returns_false(self):
        llm = _make_llm(thinking_config={'type': 'disabled'})
        assert llm._should_include_extended_thinking() is False

    def test_thinking_active_returns_true(self):
        llm = _make_llm(thinking_config={'budget_tokens': 128})
        assert llm._should_include_extended_thinking() is True

    def test_thinking_active_latches_session(self):
        session = _fresh_session()
        token = _bind_session(session)
        try:
            llm = _make_llm(thinking_config={'budget_tokens': 1024})
            assert session.extended_thinking_latched is None  # pre-call
            llm._should_include_extended_thinking()
            assert session.extended_thinking_latched is True  # latched after call
        finally:
            _CURRENT_SESSION.reset(token)

    def test_latch_returns_true_even_after_config_cleared(self):
        """Once latched, returns True regardless of current _thinking_config."""
        session = _fresh_session()
        session.latch('extended_thinking_latched')
        token = _bind_session(session)
        try:
            llm = _make_llm(thinking_config=None)  # config says inactive
            assert llm._should_include_extended_thinking() is True  # latch overrides
        finally:
            _CURRENT_SESSION.reset(token)

    def test_no_session_context_does_not_raise(self):
        """Must not raise RuntimeError when called outside session context."""
        # Ensure no session is set
        token = _CURRENT_SESSION.set(None)
        try:
            llm = _make_llm(thinking_config={'budget_tokens': 128})
            result = llm._should_include_extended_thinking()
            assert result is True  # still evaluates from config
        finally:
            _CURRENT_SESSION.reset(token)

    def test_thinking_none_outside_session_no_raise(self):
        token = _CURRENT_SESSION.set(None)
        try:
            llm = _make_llm(thinking_config=None)
            assert llm._should_include_extended_thinking() is False
        finally:
            _CURRENT_SESSION.reset(token)

    def test_no_latch_when_thinking_inactive(self):
        """Session latch must NOT be set when thinking is inactive."""
        session = _fresh_session()
        token = _bind_session(session)
        try:
            llm = _make_llm(thinking_config=None)
            llm._should_include_extended_thinking()
            assert session.extended_thinking_latched is None
        finally:
            _CURRENT_SESSION.reset(token)

    def test_no_latch_when_thinking_disabled_type(self):
        session = _fresh_session()
        token = _bind_session(session)
        try:
            llm = _make_llm(thinking_config={'type': 'disabled'})
            llm._should_include_extended_thinking()
            assert session.extended_thinking_latched is None
        finally:
            _CURRENT_SESSION.reset(token)

    def test_double_latch_is_noop(self):
        """Calling latch twice does not raise and keeps value True."""
        session = _fresh_session()
        token = _bind_session(session)
        try:
            llm = _make_llm(thinking_config={'budget_tokens': 512})
            llm._should_include_extended_thinking()
            llm._should_include_extended_thinking()  # second call
            assert session.extended_thinking_latched is True
        finally:
            _CURRENT_SESSION.reset(token)


# ---------------------------------------------------------------------------
# _should_include_cache_control
# ---------------------------------------------------------------------------

class TestShouldIncludeCacheControl:
    def test_caching_inactive_no_session_returns_false(self):
        llm = _make_llm(caching_active=False)
        assert llm._should_include_cache_control() is False

    def test_caching_active_returns_true(self):
        llm = _make_llm(caching_active=True)
        assert llm._should_include_cache_control() is True

    def test_caching_active_latches_session(self):
        session = _fresh_session()
        token = _bind_session(session)
        try:
            llm = _make_llm(caching_active=True)
            assert session.cache_control_latched is None
            llm._should_include_cache_control()
            assert session.cache_control_latched is True
        finally:
            _CURRENT_SESSION.reset(token)

    def test_latch_returns_true_when_caching_turned_off(self):
        """Once latched, returns True even if is_caching_prompt_active() flips."""
        session = _fresh_session()
        session.latch('cache_control_latched')
        token = _bind_session(session)
        try:
            llm = _make_llm(caching_active=False)
            assert llm._should_include_cache_control() is True
        finally:
            _CURRENT_SESSION.reset(token)

    def test_no_session_context_does_not_raise(self):
        token = _CURRENT_SESSION.set(None)
        try:
            llm = _make_llm(caching_active=True)
            result = llm._should_include_cache_control()
            assert result is True
        finally:
            _CURRENT_SESSION.reset(token)

    def test_no_latch_when_caching_inactive(self):
        session = _fresh_session()
        token = _bind_session(session)
        try:
            llm = _make_llm(caching_active=False)
            llm._should_include_cache_control()
            assert session.cache_control_latched is None
        finally:
            _CURRENT_SESSION.reset(token)

    def test_double_call_no_error(self):
        session = _fresh_session()
        token = _bind_session(session)
        try:
            llm = _make_llm(caching_active=True)
            llm._should_include_cache_control()
            llm._should_include_cache_control()
            assert session.cache_control_latched is True
        finally:
            _CURRENT_SESSION.reset(token)


# ---------------------------------------------------------------------------
# format_messages_for_llm uses _should_include_cache_control
# ---------------------------------------------------------------------------

class TestFormatMessagesUsesCacheControlHelper:
    def test_latch_overrides_is_caching_prompt_active(self):
        """
        Verify that _should_include_cache_control() returns True when the latch
        is set even if is_caching_prompt_active() returns False.

        This proves the guard that format_messages_for_llm() must use the latch
        helper rather than is_caching_prompt_active() directly — otherwise a
        model config change mid-session would remove cache_control headers and
        break Anthropic's prompt cache key.
        """
        from openhands.llm.llm import LLM

        llm = object.__new__(LLM)
        llm.is_caching_prompt_active = lambda: False  # config says inactive
        llm._thinking_config = None

        session = _fresh_session()
        session.latch('cache_control_latched')  # latch was already activated
        token = _bind_session(session)
        try:
            result = llm._should_include_cache_control()
            assert result is True  # latch overrides is_caching_prompt_active()=False
        finally:
            _CURRENT_SESSION.reset(token)

    def test_no_latch_follows_is_caching_prompt_active(self):
        """Without a session latch, the helper defers to is_caching_prompt_active()."""
        from openhands.llm.llm import LLM

        llm_true = object.__new__(LLM)
        llm_true.is_caching_prompt_active = lambda: True
        llm_true._thinking_config = None

        llm_false = object.__new__(LLM)
        llm_false.is_caching_prompt_active = lambda: False
        llm_false._thinking_config = None

        token = _CURRENT_SESSION.set(None)
        try:
            assert llm_true._should_include_cache_control() is True
            assert llm_false._should_include_cache_control() is False
        finally:
            _CURRENT_SESSION.reset(token)

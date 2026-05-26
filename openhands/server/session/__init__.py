"""
Package init for openhands.server.session.

WebSession (and its Session alias) are loaded lazily via __getattr__ so that
importing session_state — or any other lightweight submodule — does NOT drag in
the full server/controller/llm dependency chain at import time.  Unit tests that
only need _SessionState, get_current_session, or set_current_session remain fast
and isolated.

Production code that does ``from openhands.server.session import WebSession``
continues to work unchanged.
"""
from __future__ import annotations

from openhands.server.session.session_state import (
    _SessionState,
    get_current_session,
    set_current_session,
)

__all__ = [
    'WebSession',
    'Session',
    '_SessionState',
    'get_current_session',
    'set_current_session',
]


def __getattr__(name: str):
    if name in ('WebSession', 'Session'):
        from openhands.server.session.session import WebSession as _WebSession
        globals()['WebSession'] = _WebSession
        globals()['Session'] = _WebSession
        return globals()[name]
    raise AttributeError(
        f"module 'openhands.server.session' has no attribute {name!r}"
    )

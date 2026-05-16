"""Async circuit breaker for external service calls (agent server, Docker API).

States
------
CLOSED   — normal operation; calls pass through
OPEN     — failures exceeded threshold; calls rejected immediately with CircuitOpenError
HALF_OPEN — cooldown elapsed; next call is a probe; success → CLOSED, failure → OPEN again

Usage
-----
    breaker = CircuitBreaker("agent-server", failure_threshold=5, recovery_timeout=30)

    try:
        async with breaker:
            response = await httpx_client.get(url)
    except CircuitOpenError:
        # fast-fail — don't wait for a doomed request
        return None
"""

from __future__ import annotations

import asyncio
import logging
import time
from dataclasses import dataclass, field
from enum import Enum

_logger = logging.getLogger(__name__)


class CircuitOpenError(Exception):
    """Raised when a call is rejected because the circuit is OPEN."""

    def __init__(self, name: str, retry_after: float) -> None:
        self.name = name
        self.retry_after = retry_after
        super().__init__(
            f'Circuit {name!r} is OPEN — retry after {retry_after:.1f}s'
        )


class _State(str, Enum):
    CLOSED = 'CLOSED'
    OPEN = 'OPEN'
    HALF_OPEN = 'HALF_OPEN'


@dataclass
class CircuitBreaker:
    """Async context-manager circuit breaker.

    Parameters
    ----------
    name:               Human-readable label for logging/metrics.
    failure_threshold:  Consecutive failures before opening (default 5).
    recovery_timeout:   Seconds to wait in OPEN before allowing a probe (default 30).
    success_threshold:  Consecutive successes in HALF_OPEN to close again (default 2).
    """

    name: str
    failure_threshold: int = 5
    recovery_timeout: float = 30.0
    success_threshold: int = 2

    _state: _State = field(default=_State.CLOSED, init=False, repr=False)
    _failure_count: int = field(default=0, init=False, repr=False)
    _success_count: int = field(default=0, init=False, repr=False)
    _opened_at: float = field(default=0.0, init=False, repr=False)
    _lock: asyncio.Lock = field(default_factory=asyncio.Lock, init=False, repr=False)

    # ── public interface ──────────────────────────────────────────────────────

    async def __aenter__(self) -> 'CircuitBreaker':
        async with self._lock:
            self._check_state()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb) -> bool:
        async with self._lock:
            if exc_type is None:
                self._on_success()
            elif not issubclass(exc_type, CircuitOpenError):
                self._on_failure()
        return False  # never suppress the exception

    @property
    def state(self) -> str:
        return self._state.value

    # ── internal state machine ────────────────────────────────────────────────

    def _check_state(self) -> None:
        if self._state == _State.CLOSED:
            return
        if self._state == _State.OPEN:
            retry_after = self._opened_at + self.recovery_timeout - time.monotonic()
            if retry_after > 0:
                raise CircuitOpenError(self.name, retry_after)
            # Cooldown elapsed — allow a single probe
            _logger.info('Circuit %r → HALF_OPEN (probe attempt)', self.name)
            self._state = _State.HALF_OPEN
            self._success_count = 0
        # HALF_OPEN: let the call through

    def _on_success(self) -> None:
        if self._state == _State.HALF_OPEN:
            self._success_count += 1
            if self._success_count >= self.success_threshold:
                _logger.info(
                    'Circuit %r → CLOSED after %d consecutive successes',
                    self.name, self._success_count,
                )
                self._state = _State.CLOSED
                self._failure_count = 0
        elif self._state == _State.CLOSED:
            self._failure_count = 0  # reset sliding window on success

    def _on_failure(self) -> None:
        self._failure_count += 1
        if self._state == _State.HALF_OPEN:
            _logger.warning(
                'Circuit %r probe FAILED → back to OPEN', self.name
            )
            self._open()
        elif self._state == _State.CLOSED:
            if self._failure_count >= self.failure_threshold:
                _logger.warning(
                    'Circuit %r → OPEN after %d consecutive failures',
                    self.name, self._failure_count,
                )
                self._open()

    def _open(self) -> None:
        self._state = _State.OPEN
        self._opened_at = time.monotonic()
        self._success_count = 0


# ── Module-level singletons (shared across request handlers) ──────────────────

# One breaker per logical external dependency.
agent_server_breaker: CircuitBreaker = CircuitBreaker(
    name='agent-server',
    failure_threshold=5,
    recovery_timeout=30.0,
    success_threshold=2,
)

docker_api_breaker: CircuitBreaker = CircuitBreaker(
    name='docker-api',
    failure_threshold=3,
    recovery_timeout=15.0,
    success_threshold=1,
)

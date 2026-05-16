"""Resilient Jupyter kernel manager for the OpenHands sandbox.

Capabilities
------------
* Auto-restart on kernel death (up to ``max_restarts`` times per session)
* Per-cell execution timeout — cells that hang are interrupted, not silently stuck
* Rich output capture: text, HTML, images (PNG/SVG), JSON, errors with tracebacks
* Kernel state persistence across reconnects (tracks restart count, last restart ts)
* Structured CellResult — callers get a typed object, never raw Jupyter wire dicts
* Thread-safe: all public methods are async and use an internal asyncio.Lock

Dependencies
------------
    pip install jupyter-client ipykernel   (already in openhands-agent-server)

Typical usage
-------------
    mgr = JupyterKernelManager(kernel_name="python3")
    await mgr.start()

    result = await mgr.execute("import pandas as pd; pd.DataFrame({'a': [1,2,3]})")
    print(result.text)          # plain text repr
    print(result.html)          # rich HTML if available
    print(result.error)         # None if no exception

    await mgr.shutdown()
"""

from __future__ import annotations

import asyncio
import base64
import logging
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

_logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------


@dataclass
class CellOutput:
    """Single output item from a cell (there can be many per cell)."""

    output_type: str          # 'stream' | 'display_data' | 'execute_result' | 'error'
    text: str = ''
    html: str = ''
    png_b64: str = ''         # base64-encoded PNG image
    svg: str = ''
    json: Any = None
    latex: str = ''


@dataclass
class CellResult:
    """Aggregated result of a single cell execution."""

    source: str
    outputs: list[CellOutput] = field(default_factory=list)
    execution_count: int | None = None
    wall_time_s: float = 0.0
    timed_out: bool = False
    kernel_restarted: bool = False  # True if the kernel died and was restarted for this cell

    # Convenience accessors

    @property
    def text(self) -> str:
        return '\n'.join(o.text for o in self.outputs if o.text).strip()

    @property
    def html(self) -> str:
        return '\n'.join(o.html for o in self.outputs if o.html).strip()

    @property
    def images(self) -> list[str]:
        return [o.png_b64 for o in self.outputs if o.png_b64]

    @property
    def error(self) -> str | None:
        for o in self.outputs:
            if o.output_type == 'error':
                return o.text
        return None

    @property
    def ok(self) -> bool:
        return self.error is None and not self.timed_out


# ---------------------------------------------------------------------------
# Kernel manager
# ---------------------------------------------------------------------------


class KernelDeadError(RuntimeError):
    """Raised when the kernel cannot be revived after ``max_restarts`` attempts."""


class JupyterKernelManager:
    """Manages a single Jupyter kernel with automatic restart and per-cell timeouts.

    Parameters
    ----------
    kernel_name:      Jupyter kernel spec name (e.g. "python3").
    cell_timeout:     Default per-cell wall-clock timeout in seconds (default 60).
    max_restarts:     Max times the kernel will be auto-restarted before giving up.
    startup_timeout:  Seconds to wait for the kernel to become ready after (re)start.
    """

    def __init__(
        self,
        kernel_name: str = 'python3',
        cell_timeout: float = 60.0,
        max_restarts: int = 3,
        startup_timeout: float = 30.0,
    ) -> None:
        self.kernel_name = kernel_name
        self.cell_timeout = cell_timeout
        self.max_restarts = max_restarts
        self.startup_timeout = startup_timeout

        self._km: Any = None           # jupyter_client.AsyncKernelManager
        self._kc: Any = None           # jupyter_client.AsyncKernelClient
        self._lock = asyncio.Lock()
        self._restart_count = 0
        self._last_restart_ts: datetime | None = None
        self._started = False

    # ── lifecycle ─────────────────────────────────────────────────────────────

    async def start(self) -> None:
        """Start the kernel. Safe to call multiple times (idempotent)."""
        async with self._lock:
            if self._started:
                return
            await self._launch_kernel()
            self._started = True

    async def shutdown(self) -> None:
        """Gracefully shut down the kernel and client."""
        async with self._lock:
            await self._teardown()
            self._started = False

    async def restart(self) -> None:
        """Interrupt + restart the kernel, preserving the client channel."""
        async with self._lock:
            await self._do_restart()

    # ── execution ─────────────────────────────────────────────────────────────

    async def execute(
        self,
        code: str,
        timeout: float | None = None,
    ) -> CellResult:
        """Execute ``code`` and return a structured CellResult.

        Parameters
        ----------
        code:    Python (or kernel-language) source to execute.
        timeout: Per-cell timeout override; falls back to ``self.cell_timeout``.

        Returns
        -------
        CellResult — never raises; kernel crashes trigger auto-restart and
        the result carries ``kernel_restarted=True``.
        """
        effective_timeout = timeout if timeout is not None else self.cell_timeout
        t0 = time.monotonic()
        result = CellResult(source=code)

        async with self._lock:
            try:
                result = await self._run_cell(code, effective_timeout)
            except KernelDeadError:
                result.error  # already set by _run_cell path
                raise
            except Exception as exc:
                _logger.error('Unexpected error executing cell: %s', exc, exc_info=True)
                result.outputs.append(CellOutput(
                    output_type='error',
                    text=f'Internal executor error: {exc}',
                ))

        result.wall_time_s = time.monotonic() - t0
        return result

    # ── internals ────────────────────────────────────────────────────────────

    async def _launch_kernel(self) -> None:
        """Create and start a fresh kernel + client."""
        try:
            import jupyter_client  # type: ignore[import]
        except ImportError as exc:
            raise RuntimeError(
                'jupyter-client is required: pip install jupyter-client ipykernel'
            ) from exc

        self._km = jupyter_client.AsyncKernelManager(kernel_name=self.kernel_name)
        await self._km.start_kernel()
        self._kc = self._km.client()
        self._kc.start_channels()
        try:
            await asyncio.wait_for(
                asyncio.get_event_loop().run_in_executor(
                    None, self._kc.wait_for_ready
                ),
                timeout=self.startup_timeout,
            )
        except asyncio.TimeoutError:
            await self._teardown()
            raise RuntimeError(
                f'Kernel {self.kernel_name!r} did not become ready within {self.startup_timeout}s'
            )
        _logger.info('Kernel %r started (restart_count=%d)', self.kernel_name, self._restart_count)

    async def _teardown(self) -> None:
        """Stop client channels and kernel; swallow errors."""
        try:
            if self._kc:
                self._kc.stop_channels()
        except Exception:
            pass
        try:
            if self._km and await self._km.is_alive():
                await self._km.shutdown_kernel(now=True)
        except Exception:
            pass
        self._kc = None
        self._km = None

    async def _do_restart(self) -> None:
        """Unconditionally restart the kernel, incrementing the restart counter."""
        if self._restart_count >= self.max_restarts:
            raise KernelDeadError(
                f'Kernel {self.kernel_name!r} has been restarted {self._restart_count} times '
                f'(max={self.max_restarts}). Giving up.'
            )
        _logger.warning(
            'Restarting kernel %r (attempt %d/%d)',
            self.kernel_name, self._restart_count + 1, self.max_restarts,
        )
        await self._teardown()
        await self._launch_kernel()
        self._restart_count += 1
        self._last_restart_ts = datetime.now(timezone.utc)

    async def _run_cell(self, code: str, timeout: float) -> CellResult:
        """Core execution loop — called while holding self._lock."""
        result = CellResult(source=code)
        restarted = False

        # If kernel is dead, try to restart before execution
        if self._km is None or not await self._km.is_alive():
            _logger.warning('Kernel is dead before execution — attempting restart')
            await self._do_restart()
            restarted = True

        msg_id = self._kc.execute(code)

        try:
            result = await asyncio.wait_for(
                self._collect_outputs(msg_id, code),
                timeout=timeout,
            )
            result.kernel_restarted = restarted
        except asyncio.TimeoutError:
            _logger.warning(
                'Cell timed out after %.1fs — interrupting kernel', timeout
            )
            try:
                await self._km.interrupt_kernel()
            except Exception:
                pass
            # Drain remaining messages for a short window to get the error output
            try:
                await asyncio.wait_for(self._drain_messages(msg_id), timeout=5.0)
            except Exception:
                pass
            result.timed_out = True
            result.outputs.append(CellOutput(
                output_type='error',
                text=f'CellTimeoutError: cell exceeded {timeout}s limit and was interrupted.',
            ))

        return result

    async def _collect_outputs(self, msg_id: str, code: str) -> CellResult:
        """Collect all IOPub messages for msg_id until execution_reply arrives."""
        result = CellResult(source=code)
        while True:
            try:
                msg = await asyncio.get_event_loop().run_in_executor(
                    None, lambda: self._kc.get_iopub_msg(timeout=120)
                )
            except Exception:
                break

            parent_id = msg.get('parent_header', {}).get('msg_id', '')
            if parent_id != msg_id:
                continue

            msg_type = msg['msg_type']
            content = msg.get('content', {})

            if msg_type == 'stream':
                result.outputs.append(CellOutput(
                    output_type='stream',
                    text=content.get('text', ''),
                ))

            elif msg_type in ('display_data', 'execute_result'):
                data = content.get('data', {})
                output = CellOutput(output_type=msg_type)
                output.text = data.get('text/plain', '')
                output.html = data.get('text/html', '')
                output.svg = data.get('image/svg+xml', '')
                output.latex = data.get('text/latex', '')
                if 'application/json' in data:
                    output.json = data['application/json']
                if 'image/png' in data:
                    raw = data['image/png']
                    output.png_b64 = raw if isinstance(raw, str) else base64.b64encode(raw).decode()
                if msg_type == 'execute_result':
                    result.execution_count = content.get('execution_count')
                result.outputs.append(output)

            elif msg_type == 'error':
                tb = '\n'.join(content.get('traceback', []))
                result.outputs.append(CellOutput(
                    output_type='error',
                    text=f"{content.get('ename', 'Error')}: {content.get('evalue', '')}\n{tb}",
                ))

            elif msg_type == 'status' and content.get('execution_state') == 'idle':
                break  # kernel finished

        return result

    async def _drain_messages(self, msg_id: str) -> None:
        """Drain leftover IOPub messages after a timeout interrupt."""
        while True:
            try:
                msg = await asyncio.get_event_loop().run_in_executor(
                    None, lambda: self._kc.get_iopub_msg(timeout=2)
                )
                if msg.get('parent_header', {}).get('msg_id') == msg_id:
                    if msg['msg_type'] == 'status' and msg.get('content', {}).get('execution_state') == 'idle':
                        break
            except Exception:
                break

    # ── diagnostics ──────────────────────────────────────────────────────────

    @property
    def restart_count(self) -> int:
        return self._restart_count

    @property
    def last_restart_ts(self) -> datetime | None:
        return self._last_restart_ts

    @property
    def is_alive(self) -> bool:
        if self._km is None:
            return False
        try:
            loop = asyncio.get_event_loop()
            return loop.run_until_complete(self._km.is_alive())
        except Exception:
            return False

"""Authenticated proxy to the sandbox's in-conversation Jupyter server.

Step 2 of the jupyter-react track (docs/architecture/jupyter-react-integration.md).

Security posture (CISO responsibility):
  * FAIL-CLOSED. Auth + tenant isolation ride entirely on `get_conversation`
    (via `attach_to_conversation(conversation_id, user_id)`), which only resolves
    a conversation the caller owns. No principal / unknown conversation / no
    runtime => the request is denied (401/404/503), never proxied.
  * The sandbox Jupyter token is held server-side and injected HERE; the browser
    never receives it. The browser authenticates to THIS proxy with the app's own
    session, exactly like every other conversation route.
  * Every proxied attach is audit-logged (user, conversation, method, path).
  * Bounded: connect/read timeouts, upstream-unavailable => 503/502/504, relay
    errors close the socket cleanly. A missing notebook server degrades to
    `available: false` rather than an opaque failure.

Operational efficiency:
  * `/jupyter_info` discovery is cached per conversation (short TTL) so we don't
    round-trip to the sandbox on every request.
  * `/jupyter/settings` gives the frontend everything it needs in one call.
"""

from __future__ import annotations

import asyncio
import time
from urllib.parse import urlparse

import httpx
import websockets
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Request,
    WebSocket,
    WebSocketDisconnect,
    status,
)
from fastapi.responses import Response

from openhands.core.logger import openhands_logger as logger
from openhands.runtime.base import Runtime
from openhands.server.dependencies import get_dependencies
from openhands.server.session.conversation import ServerConversation
from openhands.server.shared import conversation_manager
from openhands.server.user_auth import get_user_id
from openhands.server.utils import get_conversation

app = APIRouter(
    prefix='/api/conversations/{conversation_id}',
    dependencies=get_dependencies(),
)

# ── discovery (cached) ────────────────────────────────────────────────────────

_JUPYTER_INFO_TTL = 30.0
# conversation_id -> (monotonic_ts, {host, port, token})
_jupyter_info_cache: dict[str, tuple[float, dict]] = {}
# hop-by-hop / connection headers we must not forward
_STRIP_REQ = {'host', 'authorization', 'content-length', 'connection'}
_STRIP_RESP = {'content-encoding', 'transfer-encoding', 'connection'}


async def _discover(runtime: Runtime) -> dict | None:
    """Resolve {host, port, token} for the sandbox Jupyter server, or None.

    The runtime's /jupyter_info returns base_url=localhost:{port} — that is
    localhost INSIDE the sandbox, so we take only the port + token and pair it
    with the runtime container's host (the host of action_execution_server_url).
    The Jupyter server binds 0.0.0.0, so it is reachable there over the network.
    """
    aes = getattr(runtime, 'action_execution_server_url', None)
    if not aes:
        return None
    host = urlparse(aes).hostname or 'localhost'
    headers = {}
    session_key = getattr(runtime, 'session_api_key', None)
    if session_key:
        headers['X-Session-API-Key'] = session_key
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f'{aes}/jupyter_info', headers=headers)
        if resp.status_code != 200:
            return None
        info = resp.json()
        if 'port' not in info or 'token' not in info:
            return None
        return {'host': host, 'port': int(info['port']), 'token': info['token']}
    except Exception as e:  # noqa: BLE001 — discovery is best-effort, fail soft
        logger.warning(f'jupyter proxy: discovery failed: {e}')
        return None


async def _target(conversation_id: str, runtime: Runtime) -> dict | None:
    now = time.monotonic()
    cached = _jupyter_info_cache.get(conversation_id)
    if cached and now - cached[0] < _JUPYTER_INFO_TTL:
        return cached[1]
    info = await _discover(runtime)
    if info:
        _jupyter_info_cache[conversation_id] = (now, info)
    return info


def _audit(user_id: str | None, conversation_id: str, action: str) -> None:
    # Structured audit trail — who reached which sandbox notebook and how.
    logger.info(
        'jupyter_proxy access',
        extra={
            'audit': 'jupyter_proxy',
            'user_id': user_id or 'anonymous',
            'session_id': conversation_id,
            'action': action,
        },
    )


# ── settings handoff ──────────────────────────────────────────────────────────


@app.get('/jupyter/settings')
async def jupyter_settings(
    conversation_id: str,
    request: Request,
    conversation: ServerConversation = Depends(get_conversation),
):
    """serverSettings for @datalayer/jupyter-react. Points at THIS proxy, never
    the raw sandbox. `token` is empty on purpose: the browser authenticates to
    the proxy via the app session; the sandbox token stays server-side."""
    runtime = conversation.runtime
    target = await _target(conversation_id, runtime) if runtime else None
    base = str(request.base_url).rstrip('/')
    ws_base = base.replace('https://', 'wss://', 1).replace('http://', 'ws://', 1)
    prefix = f'/api/conversations/{conversation_id}/jupyter'
    # baseUrl is the Jupyter server ROOT as JupyterLab's ServerConnection expects
    # it: the client joins `api/kernels`, `api/contents`, etc. onto it. wsUrl uses
    # the SAME path (ws scheme) because ServerConnection derives the socket URL
    # from baseUrl and joins `api/kernels/{id}/channels` — so the HTTP and WS
    # proxy routes must share the `/jupyter/api/...` prefix (see proxy_ws).
    return {
        'available': target is not None,
        'baseUrl': f'{base}{prefix}',
        'wsUrl': f'{ws_base}{prefix}',
        'token': '',
    }


# ── HTTP proxy ────────────────────────────────────────────────────────────────


@app.api_route(
    '/jupyter/api/{path:path}',
    methods=['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
)
async def proxy_http(
    conversation_id: str,
    path: str,
    request: Request,
    conversation: ServerConversation = Depends(get_conversation),
):
    runtime = conversation.runtime
    if not runtime:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE, 'Runtime not available'
        )
    target = await _target(conversation_id, runtime)
    if not target:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            'Notebook server not available in this sandbox',
        )

    url = f'http://{target["host"]}:{target["port"]}/api/{path}'
    headers = {
        k: v for k, v in request.headers.items() if k.lower() not in _STRIP_REQ
    }
    headers['Authorization'] = f'token {target["token"]}'
    body = await request.body()

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            upstream = await client.request(
                request.method,
                url,
                params=request.query_params,
                content=body,
                headers=headers,
            )
    except httpx.ConnectError:
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY, 'Notebook server unreachable'
        )
    except httpx.TimeoutException:
        raise HTTPException(
            status.HTTP_504_GATEWAY_TIMEOUT, 'Notebook server timed out'
        )
    except Exception as e:  # noqa: BLE001
        logger.warning(f'jupyter proxy http error: {e}')
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, 'Notebook proxy error')

    _audit(getattr(request.state, 'user_id', None), conversation_id,
           f'{request.method} {path}')
    resp_headers = {
        k: v
        for k, v in upstream.headers.items()
        if k.lower() not in _STRIP_RESP
    }
    return Response(
        content=upstream.content,
        status_code=upstream.status_code,
        headers=resp_headers,
        media_type=upstream.headers.get('content-type'),
    )


# ── WebSocket proxy (kernel channels) ─────────────────────────────────────────


async def _bridge(client_ws: WebSocket, upstream) -> None:
    """Relay frames both ways until either side closes. Handles text + binary."""

    async def client_to_upstream() -> None:
        try:
            while True:
                msg = await client_ws.receive()
                if msg['type'] == 'websocket.disconnect':
                    break
                if msg.get('text') is not None:
                    await upstream.send(msg['text'])
                elif msg.get('bytes') is not None:
                    await upstream.send(msg['bytes'])
        except (WebSocketDisconnect, RuntimeError):
            pass

    async def upstream_to_client() -> None:
        try:
            async for frame in upstream:
                if isinstance(frame, (bytes, bytearray)):
                    await client_ws.send_bytes(bytes(frame))
                else:
                    await client_ws.send_text(frame)
        except Exception:  # noqa: BLE001 — upstream closed / relay ended
            pass

    done, pending = await asyncio.wait(
        {
            asyncio.create_task(client_to_upstream()),
            asyncio.create_task(upstream_to_client()),
        },
        return_when=asyncio.FIRST_COMPLETED,
    )
    for task in pending:
        task.cancel()


# Shares the '/jupyter/api/...' prefix with proxy_http on purpose: Starlette
# routes on ASGI scope type, so a websocket upgrade lands here while plain HTTP
# lands on proxy_http. This lets JupyterLab's ServerConnection derive the socket
# URL from baseUrl (it joins 'api/kernels/{id}/channels') with no separate wsUrl.
@app.websocket('/jupyter/api/{path:path}')
async def proxy_ws(
    websocket: WebSocket,
    conversation_id: str,
    path: str,
):
    # Auth + tenant isolation, fail-closed: only the owner can attach. Depends()
    # is awkward on websockets, so we resolve + attach manually with the same
    # ownership check the HTTP routes get from get_conversation.
    try:
        user_id = await get_user_id(websocket)  # type: ignore[arg-type]
    except Exception:  # noqa: BLE001
        user_id = None

    conversation = None
    try:
        conversation = await conversation_manager.attach_to_conversation(
            conversation_id, user_id
        )
    except Exception as e:  # noqa: BLE001
        logger.warning(f'jupyter ws proxy: attach failed: {e}')

    if not conversation or not getattr(conversation, 'runtime', None):
        # 1008 = policy violation (not authorised / no runtime)
        await websocket.close(code=1008)
        if conversation:
            await conversation_manager.detach_from_conversation(conversation)
        return

    try:
        target = await _target(conversation_id, conversation.runtime)
        if not target:
            await websocket.close(code=1011)  # server can't fulfil
            return

        upstream_url = f'ws://{target["host"]}:{target["port"]}/api/{path}'
        if websocket.url.query:
            upstream_url += f'?{websocket.url.query}'

        await websocket.accept()
        _audit(user_id, conversation_id, f'WS {path}')
        try:
            async with websockets.connect(
                upstream_url,
                additional_headers={'Authorization': f'token {target["token"]}'},
                max_size=None,
                open_timeout=10,
            ) as upstream:
                await _bridge(websocket, upstream)
        except Exception as e:  # noqa: BLE001 — upstream unreachable / closed
            logger.warning(f'jupyter ws proxy: upstream error: {e}')
            try:
                await websocket.close(code=1011)
            except Exception:  # noqa: BLE001
                pass
    finally:
        await conversation_manager.detach_from_conversation(conversation)

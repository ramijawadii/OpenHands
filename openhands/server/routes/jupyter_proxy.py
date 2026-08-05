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
import json
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
        # CRITICAL: reach the JUPYTER port by the runtime's CONTAINER NAME, not the
        # action_execution_server_url host. When the runtime is addressed via the
        # host's published action port (e.g. host.docker.internal:33402), the
        # jupyter port is NOT host-published — it lives only on the shared docker
        # network, where container-to-container any port is reachable. The
        # container name resolves there; host.docker.internal:<jupyter> would 502.
        jupyter_host = getattr(runtime, 'container_name', None) or host
        return {
            'host': jupyter_host,
            'port': int(info['port']),
            'token': info['token'],
        }
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

# The full JupyterLab IDE hits the lab-server APIs, which the Jupyter server
# serves under /lab/api/* — but JupyterLab's client requests them under /api/*
# (relative to baseUrl). Rewrite those so the settings / themes / translations /
# workspaces / listings plugins (and thus the whole shell) resolve instead of
# 404-ing. Kernel/contents/sessions/terminals stay under /api/*.
_LAB_APIS = ('settings', 'workspaces', 'translations', 'themes', 'listings')

# SB4.3 (HARD control-plane gate) — the analyst's notebook file browser exposes ONLY user/agent
# notebooks. The sandbox keeps seam-client code + telemetry under /workspace (cloudguard-runtime/,
# scripts/) and agent diagrams (pages/) — none of that is the analyst's, and this is enforced HERE, in
# the trusted control-plane proxy the browser is forced through, NOT by a sandbox-side hide (which a
# user could toggle off). Any /api/contents request INTO one of these is 404'd; the root listing is
# filtered to notebooks + user folders. The agent's kernel reaches the server on loopback (not this
# proxy), so its own access to seam clients / pages is unaffected.
_CONTENTS_DENY = frozenset({
    'cloudguard-runtime', 'scripts', 'templates', 'pages', 'node_modules',
    '.openhands', '.cloudguard', '.git', '.venv', '.ipynb_checkpoints', '.config', '.local', '.cache',
})


def _contents_subpath(path: str) -> "str | None":
    """The path under /api/contents/ for a contents request, else None. '' for the root listing."""
    for pfx in ('api/contents/', 'api/contents'):
        if path == pfx.rstrip('/') or path.startswith(pfx):
            return path[len('api/contents'):].lstrip('/')
    return None


def _blocked_contents(sub: str) -> bool:
    """True if this contents subpath points into a system/IP area the analyst must never see."""
    if not sub:
        return False
    top = sub.split('/', 1)[0]
    return top in _CONTENTS_DENY or top.startswith('.')


def _filter_root_listing(raw: bytes) -> "bytes | None":
    """Filter a root /api/contents directory model to notebooks + non-system user folders only."""
    try:
        model = json.loads(raw)
    except Exception:  # noqa: BLE001
        return None
    if model.get('type') != 'directory' or not isinstance(model.get('content'), list):
        return None
    model['content'] = [
        c for c in model['content']
        if c.get('type') == 'notebook'
        or (c.get('type') == 'directory' and c.get('name') not in _CONTENTS_DENY and not str(c.get('name', '')).startswith('.'))
    ]
    return json.dumps(model).encode()


def _upstream_path(path: str) -> str:
    if path.startswith('api/'):
        rest = path[len('api/') :]
        if rest.split('/', 1)[0] in _LAB_APIS:
            return f'lab/api/{rest}'
    elif path.startswith('@'):
        # Theme CSS + assets are requested as a scoped package relative to
        # baseUrl (e.g. `@jupyterlab/theme-light-extension/index.css`) but the
        # server serves them under /lab/api/themes/. Without this the ThemeManager
        # shows "Stylesheet failed to load".
        return f'lab/api/themes/{path}'
    return path


@app.api_route(
    '/jupyter/{path:path}',
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

    # HARD GATE: reject any browser request into a system/IP contents path (see _CONTENTS_DENY).
    _sub = _contents_subpath(path)
    if _sub is not None and _blocked_contents(_sub):
        _audit(getattr(request.state, 'user_id', None), conversation_id, f'BLOCKED contents {_sub}')
        raise HTTPException(status.HTTP_404_NOT_FOUND, 'Not found')

    url = f'http://{target["host"]}:{target["port"]}/{_upstream_path(path)}'
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
    # HARD GATE: filter the ROOT contents listing to notebooks + user folders (strip cloudguard-runtime,
    # scripts, pages, dotdirs, loose non-notebook files) so the browser can't even see them exist.
    content = upstream.content
    if _sub == '' and request.method == 'GET' and upstream.status_code == 200:
        filtered = _filter_root_listing(upstream.content)
        if filtered is not None:
            content = filtered
            resp_headers.pop('content-length', None)
            resp_headers.pop('Content-Length', None)
    return Response(
        content=content,
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


# Shares the '/jupyter/...' catch-all prefix with proxy_http on purpose: Starlette
# routes on ASGI scope type, so a websocket upgrade lands here while plain HTTP
# lands on proxy_http. Covers kernel channels (api/kernels/{id}/channels) AND lab
# terminals (terminals/websocket/{name}) with no separate wsUrl.
@app.websocket('/jupyter/{path:path}')
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

        upstream_url = (
            f'ws://{target["host"]}:{target["port"]}/{_upstream_path(path)}'
        )
        if websocket.url.query:
            upstream_url += f'?{websocket.url.query}'

        # Negotiate the Jupyter kernel subprotocol END-TO-END. JupyterLab's browser
        # client opens the kernel channels socket with the BINARY protocol
        # `v1.kernel.websocket.jupyter.org`. If the proxy accepts toward the
        # browser without selecting that subprotocol AND doesn't request it from
        # the upstream Jupyter server, the two legs disagree on frame encoding and
        # the socket is [accepted] then closes immediately (no kernel). So: connect
        # upstream FIRST offering the same subprotocols, then accept toward the
        # browser echoing whatever the server actually selected.
        requested = websocket.headers.get('sec-websocket-protocol', '')
        offered = [p.strip() for p in requested.split(',') if p.strip()]
        try:
            async with websockets.connect(
                upstream_url,
                additional_headers={'Authorization': f'token {target["token"]}'},
                subprotocols=offered or None,  # type: ignore[arg-type]
                max_size=None,
                open_timeout=10,
            ) as upstream:
                await websocket.accept(subprotocol=upstream.subprotocol)
                _audit(user_id, conversation_id, f'WS {path}')
                await _bridge(websocket, upstream)
        except Exception as e:  # noqa: BLE001 — upstream unreachable / closed
            logger.warning(f'jupyter ws proxy: upstream error: {e}')
            try:
                await websocket.close(code=1011)
            except Exception:  # noqa: BLE001
                pass
    finally:
        await conversation_manager.detach_from_conversation(conversation)

"""Same-origin proxy for the Seafile artifact store.

The Files tab frames Seafile's own library UI. That frame only works if Seafile
is served from the SAME ORIGIN as the app, because Seafile issues its session as
`sessionid=...; SameSite=Lax` and the browser withholds a Lax cookie on
cross-origin iframe requests — a frame pointed at Seafile's own port renders a
permanent login page however many times the analyst signs in.

The oo-gateway already serves both on one origin, but only on ITS port. Analysts
reach the app directly, and there `/seafile/...` hit the SPA, which has no such
route and rendered its own 404 inside the frame ("No routes matched location
/seafile/library/..."). Telling people to switch ports is not a fix. Proxying
here makes the embed work on whichever origin the app is actually served from,
gateway or not.

Two prefixes, and both are needed:
  /seafile/*   seahub, which SITE_ROOT moved under the prefix
  /seafhttp/*  the fileserver, which does NOT move — it stays at the origin root
               even under a sub-path deployment, and Seafile generates its
               upload/download links without the prefix. Miss it and browsing
               works while every file read or write 404s.

Registered BEFORE the SPA's catch-all mount at "/" (listen.py), which is what
lets these paths win over the frontend router.
"""

from __future__ import annotations

import os
from urllib.parse import urlsplit

import httpx
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse, StreamingResponse
from starlette.background import BackgroundTask

router = APIRouter()

# Headers that describe ONE hop and must not be forwarded: passing them on
# corrupts framing or advertises an encoding the proxied body no longer uses.
_DROP_REQUEST = {'host', 'content-length', 'connection', 'keep-alive', 'upgrade'}
_DROP_RESPONSE = {'content-length', 'content-encoding', 'transfer-encoding', 'connection', 'keep-alive'}

_TIMEOUT = httpx.Timeout(60.0, read=300.0)


def _upstream_origin() -> str | None:
    """Origin of the Seafile server, without any SITE_ROOT prefix.

    Derived from the same setting the driver uses, so there is one place to
    configure the store. The PATH is deliberately discarded: the incoming
    request already carries the full path, prefix included.
    """
    raw = (os.environ.get('CLOUDGUARD_SEAFILE_URL') or '').strip()
    if not raw:
        return None
    parts = urlsplit(raw)
    if not parts.scheme or not parts.netloc:
        return None
    return f'{parts.scheme}://{parts.netloc}'


async def _proxy(request: Request) -> StreamingResponse | JSONResponse:
    origin = _upstream_origin()
    if not origin:
        return JSONResponse(
            {'error': 'artifact store not configured (CLOUDGUARD_SEAFILE_URL)'},
            status_code=503,
        )

    path = request.url.path
    # Django is told SITE_ROOT=/seafile/ so it EMITS /seafile/media/..., but the
    # Seafile container still SERVES those files at /media/. Strip the prefix for
    # static assets only. The alternative — pointing MEDIA_URL back at the root —
    # would put Seafile's assets on a path the CloudGuard SPA also owns.
    if path.startswith('/seafile/media/'):
        path = path[len('/seafile') :]

    url = f'{origin}{path}'
    if request.url.query:
        url = f'{url}?{request.url.query}'

    headers = {k: v for k, v in request.headers.items() if k.lower() not in _DROP_REQUEST}

    client = httpx.AsyncClient(timeout=_TIMEOUT, follow_redirects=False)
    try:
        upstream = client.build_request(
            request.method, url, headers=headers, content=await request.body()
        )
        # stream=True so a large artifact is not buffered in the app; redirects
        # are passed THROUGH rather than followed, because Seafile's 302 to its
        # own login page is meaningful to the browser and already carries the
        # right prefix.
        response = await client.send(upstream, stream=True)
    except httpx.HTTPError as exc:
        await client.aclose()
        return JSONResponse({'error': f'artifact store unreachable: {exc}'}, status_code=502)

    # aiter_bytes, NOT aiter_raw. aiter_raw yields the body still gzip-encoded,
    # and since content-encoding is dropped below the browser would be handed
    # compressed bytes it has been told are plain — the page arrives as garbage
    # and every parse of it (a CSRF token, say) silently comes back empty.
    # aiter_bytes hands over decoded bytes, which is what the dropped
    # content-encoding/content-length then describe correctly.
    out = {
        k: v
        for k, v in response.headers.items()
        if k.lower() not in _DROP_RESPONSE and k.lower() != 'set-cookie'
    }
    proxied = StreamingResponse(
        response.aiter_bytes(),
        status_code=response.status_code,
        headers=out,
        # The client outlives this function — it must not be closed until the
        # body has finished streaming, or the download truncates.
        background=BackgroundTask(client.aclose),
    )

    # Set-Cookie is the one header that legitimately repeats, and a dict keeps
    # only the last. Seafile sends sessionid AND sfcsrftoken together, so
    # collapsing them loses the login: the browser gets one cookie, the next
    # request fails CSRF, and the frame sits on a 403 that looks like bad
    # credentials.
    for key, value in response.headers.multi_items():
        if key.lower() == 'set-cookie':
            proxied.raw_headers.append((b'set-cookie', value.encode('latin-1')))

    return proxied


_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']


@router.api_route('/seafile/{path:path}', methods=_METHODS)
async def seafile_ui(path: str, request: Request):
    return await _proxy(request)


@router.api_route('/seafhttp/{path:path}', methods=_METHODS)
async def seafile_fileserver(path: str, request: Request):
    return await _proxy(request)

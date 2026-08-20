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

import asyncio
import base64
import hashlib
import hmac
import os
import re
from pathlib import Path
from urllib.parse import urlsplit

import httpx
from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse, StreamingResponse
from starlette.background import BackgroundTask
from fastapi.responses import Response as PlainResponse

from openhands.server.routes.cloudguard_principal import require_principal

router = APIRouter()

# Headers that describe ONE hop and must not be forwarded: passing them on
# corrupts framing or advertises an encoding the proxied body no longer uses.
_DROP_REQUEST = {'host', 'content-length', 'connection', 'keep-alive', 'upgrade'}
_DROP_RESPONSE = {'content-length', 'content-encoding', 'transfer-encoding', 'connection', 'keep-alive'}

_TIMEOUT = httpx.Timeout(60.0, read=300.0)

# Capabilities the console does not expose, refused HERE rather than hidden in
# CSS. Every request to the store passes through this proxy, so this is the
# enforcement point: the capability is gone, not the button. Hiding a control
# whose endpoint still answers is not a control — and Seafile gates none of
# these behind a server setting, so there is nothing to switch off upstream.
_DENIED_PREFIXES = (
    # Pulling a third-party wiki INTO the artifact store. Content that arrives
    # this way has no conversation, no provenance and no audit trail.
    '/seafile/api/v2.1/import-confluence',
    # External share and upload links — the role permission already refuses
    # these, and this makes the refusal independent of role configuration.
    '/seafile/api/v2.1/share-links',
    '/seafile/api/v2.1/upload-links',
)

_STATIC = Path(__file__).resolve().parent.parent / 'static'
_SKIN = _STATIC / 'seafile-embed.css'
_BEHAVIOUR = _STATIC / 'seafile-embed.js'


def _skin_css() -> str:
    try:
        return _SKIN.read_text(encoding='utf-8')
    except OSError:
        return ''


def _skin_js() -> str:
    try:
        return _BEHAVIOUR.read_text(encoding='utf-8')
    except OSError:
        return ''


# ── Re-theming Seafile's OWN stylesheets ────────────────────────────────────
# An override sheet can only cover the rules someone thought to look at, and
# this frame proved that repeatedly: white detail drawers, amber file names and
# invisible labels each surfaced only once a human looked at a particular panel.
# Seafile ships 7.3MB of CSS with ~15k hardcoded colours, so "find them all by
# hand" is not a plan.
#
# Instead the stylesheets are rewritten AS THEY ARE SERVED. Every literal colour
# is mapped onto one of the console's tokens, so a rule is themed whether or not
# anyone has ever seen the panel it draws. Tokens (not fixed colours) are
# substituted, so ONE transform serves dark and light — the injected sheet
# defines what each token means for the current theme.
#
# Counts below are from the shipped files, so the mapping is driven by what
# Seafile actually uses rather than by guesswork.
_CSS_COLOR_MAP = {
    # surfaces — the page itself (2870 uses of #fff alone)
    '#fff': 'var(--id-bg-rail)',
    '#ffffff': 'var(--id-bg-rail)',
    # raised/striped surfaces: hovers, table stripes, disabled fills
    '#f5f5f5': 'var(--id-bg-hover)',
    '#f2f2f2': 'var(--id-bg-hover)',
    '#f1f1f1': 'var(--id-bg-hover)',
    '#f0f0f0': 'var(--id-bg-hover)',
    '#efefef': 'var(--id-bg-hover)',
    '#eee': 'var(--id-bg-hover)',
    '#e9ecef': 'var(--id-bg-hover)',
    '#e5e5e5': 'var(--id-bg-active)',
    '#e5e6e8': 'var(--id-bg-active)',
    # borders and rules
    '#ccc': 'var(--id-border-strong)',
    '#cacaca': 'var(--id-border-strong)',
    '#bdbdbd': 'var(--id-border-strong)',
    '#ddd': 'var(--id-border-strong)',
    '#dee2e6': 'var(--id-border-strong)',
    # body text
    '#212529': 'var(--id-text)',
    '#303133': 'var(--id-text)',
    '#333': 'var(--id-text)',
    '#000': 'var(--id-text)',
    '#000000': 'var(--id-text)',
    # secondary text
    '#666': 'var(--id-text-muted)',
    '#555': 'var(--id-text-muted)',
    '#444': 'var(--id-text-muted)',
    '#999': 'var(--id-text-muted)',
    '#aaa': 'var(--id-text-muted)',
    # Seafile's amber, and its one blue — a second accent inside the console
    # reads as a different product.
    '#f09f3f': 'var(--id-accent)',
    '#f09f4f': 'var(--id-accent)',
    '#ff9800': 'var(--id-accent)',
    '#ed7109': 'var(--id-accent)',
    '#eb8205': 'var(--id-accent)',
    '#1070ca': 'var(--id-accent)',
}

# Family names that ARE a glyph set rather than a typeface. Substituting these
# turns every icon into a missing-glyph box.
_ICON_FONT_HINTS = (
    'sf3-font',
    'sf2-icon',
    'seafile-font',
    'iconfont',
    'fontawesome',
    'font awesome',
    'glyphicon',
    'material icons',
    'mono',
    'courier',
)

_APP_FONT = (
    '-apple-system, "SF Pro", BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, '
    'Ubuntu, Cantarell, "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif'
)

# Colours inside url(...) are ICON ARTWORK — inline SVG fill/stroke. Rewriting
# those turns every embedded glyph into a broken shape, so they are lifted out
# before substitution and put back after.
_URL_RE = re.compile(r'url\([^)]*\)')
# Longest form FIRST, with a guard after the 3-digit branch. `{3,8}` looks
# right and is not: on `#ffffff` it matches only the first three characters,
# so a six-digit colour becomes `var(--id-bg-rail)fff` and corrupts the rest
# of the rule.
_HEX_RE = re.compile(r'#[0-9a-fA-F]{8}|#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}(?![0-9a-fA-F])')
_FONT_RE = re.compile(r'font-family\s*:\s*[^;}]+', re.IGNORECASE)

# Properties whose colour is TEXT rather than a surface.
_TEXT_PROPS = {'color', '-webkit-text-fill-color'}

# Text keeps its contrast relationship. White label text stays white — it sits on
# a button we are not turning white — while Seafile's dark greys become the
# console's text tokens.
_TEXT_COLOR_MAP = {
    '#fff': 'var(--id-text-on-accent)',
    '#ffffff': 'var(--id-text-on-accent)',
    '#212529': 'var(--id-text)',
    '#303133': 'var(--id-text)',
    '#333': 'var(--id-text)',
    '#000': 'var(--id-text)',
    '#000000': 'var(--id-text)',
    '#666': 'var(--id-text-muted)',
    '#555': 'var(--id-text-muted)',
    '#444': 'var(--id-text-muted)',
    '#999': 'var(--id-text-muted)',
    '#aaa': 'var(--id-text-muted)',
    '#f09f3f': 'var(--id-accent)',
    '#f09f4f': 'var(--id-accent)',
    '#ff9800': 'var(--id-accent)',
    '#ed7109': 'var(--id-accent)',
    '#eb8205': 'var(--id-accent)',
    '#1070ca': 'var(--id-accent)',
}

# `prop: value` up to the next delimiter. The separator is captured so the
# original spacing survives the rewrite.
_DECL_RE = re.compile(r'([-a-zA-Z]+)(?P<sep>\s*:\s*)([^;{}]+)')

_css_cache: dict[str, bytes] = {}


def _retheme_css(text: str) -> str:
    """Map Seafile's literal colours and fonts onto the console's tokens.

    PROPERTY-AWARE, and it has to be. A colour means different things depending
    on what it paints: `background:#fff` is a surface, `color:#fff` is text
    sitting on something darker. Mapping both through one table turned white
    button labels into `var(--id-bg-rail)` — white on white, invisible — which is
    exactly the light-mode text that went missing.
    """
    holds: list[str] = []

    def _hold(m: 're.Match') -> str:
        holds.append(m.group(0))
        return f'__IDURL{len(holds) - 1}__'

    text = _URL_RE.sub(_hold, text)

    def _swap_decl(m: 're.Match') -> str:
        prop = m.group(1).lower()
        # group(2) is the named `sep`; the VALUE is group(3). Reading group(2)
        # here silently replaced every declaration's value with its own colon.
        value = m.group(3)
        table = _TEXT_COLOR_MAP if prop in _TEXT_PROPS else _CSS_COLOR_MAP
        return m.group(1) + m.group('sep') + _HEX_RE.sub(
            lambda h: table.get(h.group(0).lower(), h.group(0)), value
        )

    text = _DECL_RE.sub(_swap_decl, text)

    # One typeface across the console — but ONLY for text.
    #
    # A font-family declaration is not always about type. Seafile draws its icons
    # with icon FONTS (`font-family: "sf3-font"`, `seafile-font2`), where the
    # family name IS the glyph set: rewriting it to a text stack replaces every
    # icon with a missing-glyph box.
    def _swap_font(m: 're.Match') -> str:
        decl = m.group(0)
        low = decl.lower()
        if any(k in low for k in _ICON_FONT_HINTS):
            return decl
        if not any(k in low for k in ('sans-serif', 'serif', 'system-ui')):
            return decl
        return f'font-family: {_APP_FONT}'

    text = _FONT_RE.sub(_swap_font, text)

    for i, held in enumerate(holds):
        text = text.replace(f'__IDURL{i}__', held)
    return text


def _reskin(body: bytes, theme: str) -> bytes:
    """Inject the console skin into a Seafile HTML page.

    Injection rather than patching seahub's templates: Seafile stays STOCK, so an
    upgrade cannot silently revert the branding and we are not maintaining a fork
    of its front end.

    The theme is passed in because a framed document cannot read the parent's CSS
    variables across the document boundary — the console tells us which palette
    it is currently showing and we set the matching class.
    """
    css = _skin_css()
    if not css:
        return body
    try:
        html = body.decode('utf-8')
    except UnicodeDecodeError:
        return body
    if '</head>' not in html:
        return body

    cls = 'cg-light' if theme == 'light' else 'cg-dark'
    # Palette class on <html> itself so the variables resolve before first paint
    # rather than flashing Seafile's own colours first.
    head = (
        f'<style id="id-embed-skin">{css}</style>'
        f'<script>document.documentElement.classList.add("{cls}");</script>'
    )
    html = html.replace('</head>', head + '</head>', 1)

    # Behaviour goes at the END of body: it queries the DOM, and the sidebar it
    # prunes does not exist until React has rendered.
    behaviour = _skin_js()
    if behaviour and '</body>' in html:
        html = html.replace(
            '</body>', f'<script id="id-embed-behaviour">{behaviour}</script></body>', 1
        )
    return html.encode('utf-8')


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


# ── Per-user identity in the store ──────────────────────────────────────────
# The console is used by a TEAM inside a workspace inside an org, so one shared
# Seafile login would attribute every action to a service account and make the
# store's own history useless for collaboration. Each console Principal instead
# gets its own Seafile account, its own session, and its own share of the
# library — so Seafile records who actually renamed, deleted or restored a file.
#
# Sessions are cached per account; provisioning happens once per account and is
# then skipped.
_sessions: dict[str, str] = {}
_provisioned: set[str] = set()
_session_lock = asyncio.Lock()

# SHORT on purpose. Seafile rejects a long account name with a bare HTTP 500 —
# measured: a 42-character address is created (201) while a 69-character one
# fails (500), with no validation message to explain it. A hashed local part
# keeps every derived address the same, safe length regardless of how long the
# console subject and tenant are.
_ACCOUNT_DOMAIN = 'id.local'


def _identity(principal) -> tuple[str, str] | None:
    """Deterministic (email, password) for a console principal.

    Deterministic so nothing has to be STORED: the password is derived from a
    server-side secret and the account name, never leaves this process, and is
    never shown to the user — they authenticate to the console, not to Seafile.
    Deriving beats persisting a credential we would then have to protect.

    Keyed on tenant AND subject, so the same username in two tenants is two
    accounts. Returns None when there is no secret to derive from, in which case
    the caller falls back rather than inventing a guessable password.
    """
    secret = (
        os.environ.get('CLOUDGUARD_SEAFILE_USER_SECRET')
        or os.environ.get('SEAFILE_JWT_KEY')
        or os.environ.get('CLOUDGUARD_SEAFILE_TOKEN')
        or ''
    ).strip()
    if not secret:
        return None

    subject = _slug(getattr(principal, 'subject', '') or 'console')
    tenant = _slug(getattr(principal, 'tenant_id', '') or 'default')
    # Hashed, not concatenated — see _ACCOUNT_DOMAIN. Tenant is inside the hash
    # so the same username in two tenants is two accounts, and the display name
    # set at provisioning is what makes the account readable in Seafile's own
    # history.
    handle = hashlib.sha256(f'{tenant}|{subject}'.encode()).hexdigest()[:16]
    email = f'u{handle}@{_ACCOUNT_DOMAIN}'
    digest = hmac.new(secret.encode(), email.encode(), hashlib.sha256).digest()
    # Seafile enforces a password policy; a urlsafe b64 digest with a fixed
    # prefix satisfies length + character-class rules without a retry loop.
    password = 'Id1!' + base64.urlsafe_b64encode(digest).decode().rstrip('=')[:28]
    return email, password


def _slug(raw: str) -> str:
    keep = [c if (c.isalnum() or c in '-_') else '-' for c in str(raw).lower()]
    return ''.join(keep).strip('-')[:48] or 'user'


def _admin_headers() -> dict[str, str] | None:
    token = (os.environ.get('CLOUDGUARD_SEAFILE_TOKEN') or '').strip()
    return {'Authorization': f'Token {token}'} if token else None


async def _find_account(client: httpx.AsyncClient, base: str, admin: dict, email: str) -> str | None:
    """The internal Seafile id for our derived address, if the account exists.

    Seafile 13 does NOT store the address you ask for as the account's email: it
    mints an opaque `<uuid>@auth.local` id and keeps yours as `contact_email`.
    Creating blindly therefore makes a NEW account on every request — measured,
    that is exactly what happened before this lookup existed. Login still works
    with the contact_email, which is why the sprawl was invisible from the
    frame.
    """
    try:
        found = await client.get(
            f'{base}/api/v2.1/admin/search-user/', headers=admin, params={'query': email}
        )
        if found.status_code >= 400:
            return None
        for user in found.json().get('user_list', []):
            if (user.get('contact_email') or '').lower() == email.lower():
                return user.get('email')
    except (httpx.HTTPError, ValueError):
        return None
    return None


async def _provision(
    client: httpx.AsyncClient, origin: str, email: str, password: str, display: str = ''
) -> bool:
    """Ensure the account exists and can reach the artifact library. Idempotent."""
    admin = _admin_headers()
    if not admin:
        return False
    base = f'{origin}/seafile'
    try:
        internal = await _find_account(client, base, admin, email)
        if internal is None:
            created = await client.post(
                f'{base}/api/v2.1/admin/users/',
                headers=admin,
                # `name` is what Seafile shows in its own activity and history,
                # so the derived address stays an implementation detail rather
                # than what a teammate sees next to a change.
                data={'email': email, 'password': password, 'name': display or email},
            )
            if created.status_code >= 400:
                return False
            internal = created.json().get('email')
        if not internal:
            return False

        repo_id = (os.environ.get('CLOUDGUARD_SEAFILE_REPO_ID') or '').strip()
        if repo_id:
            # Shared to the INTERNAL id, not our address — the share API keys on
            # the account's own email, and a share to the contact_email silently
            # does nothing.
            #
            # Read-write: the library is the team's shared workspace, and a
            # reader who cannot restore a file cannot use the recovery this
            # store exists to provide.
            await client.put(
                f'{base}/api2/repos/{repo_id}/dir/shared_items/',
                headers=admin,
                params={'p': '/'},
                data={'share_type': 'user', 'username': internal, 'permission': 'rw'},
            )
    except (httpx.HTTPError, ValueError):
        return False
    return True


async def _session_for(origin: str, principal) -> str | None:
    """This principal's own Seafile session cookie, provisioning on first use."""
    ident = _identity(principal)
    if not ident:
        return None
    email, password = ident

    async with _session_lock:
        cached = _sessions.get(email)
        if cached:
            return cached

        login_url = f'{origin}/seafile/accounts/login/'
        try:
            async with httpx.AsyncClient(timeout=30.0, follow_redirects=False) as client:
                if email not in _provisioned:
                    display = str(getattr(principal, 'subject', '') or '').strip()
                    if not await _provision(client, origin, email, password, display):
                        return None
                    _provisioned.add(email)

                page = await client.get(login_url)
                token = ''
                for chunk in page.text.split('name="csrfmiddlewaretoken"'):
                    if 'value="' in chunk[:80]:
                        token = chunk.split('value="', 1)[1].split('"', 1)[0]
                        break
                posted = await client.post(
                    login_url,
                    data={
                        'csrfmiddlewaretoken': token,
                        'login': email,
                        'password': password,
                    },
                    # Django validates Referer/Origin on the login POST; send the
                    # page's own URL so it passes the way a browser would.
                    headers={'Referer': login_url, 'Origin': origin},
                    cookies=page.cookies,
                )
                sid = posted.cookies.get('sessionid') or client.cookies.get('sessionid')
                if sid and posted.status_code in (301, 302):
                    _sessions[email] = sid
                    return sid
        except httpx.HTTPError:
            return None
    return None


def _invalidate_session(principal=None) -> None:
    """Drop cached sessions so the next request logs in again."""
    ident = _identity(principal) if principal is not None else None
    if ident:
        _sessions.pop(ident[0], None)
    else:
        _sessions.clear()


async def _proxy(request: Request, principal) -> StreamingResponse | JSONResponse:
    origin = _upstream_origin()
    if not origin:
        return JSONResponse(
            {'error': 'artifact store not configured (CLOUDGUARD_SEAFILE_URL)'},
            status_code=503,
        )

    path = request.url.path

    if any(path.startswith(prefix) for prefix in _DENIED_PREFIXES):
        return JSONResponse(
            {'error': 'this capability is not available in the console'},
            status_code=403,
        )
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

    # Single sign-on, per user. The analyst authenticated to the console
    # already, so a second login prompt for a service they did not choose is the
    # wrong seam — but the session attached is THEIR OWN, derived from the
    # request principal, not a shared service account. That is what keeps
    # Seafile's own history meaningful when a team shares a workspace: it records
    # who actually renamed, deleted or restored a file.
    if 'sessionid=' not in headers.get('cookie', ''):
        sid = await _session_for(origin, principal)
        if sid:
            existing = headers.get('cookie', '')
            headers['cookie'] = f'{existing}; sessionid={sid}'.lstrip('; ')

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
    # HTML is BUFFERED so the skin can be injected; everything else keeps
    # streaming, because an artifact download must not be held in memory just
    # because pages need rewriting.
    ctype = response.headers.get('content-type', '')

    # Stylesheets are rewritten onto the console's tokens. Cached by path: the
    # files are content-hashed by Seafile, so a given URL's bytes never change,
    # and re-running the substitution over megabytes on every request would be
    # pure waste.
    if 'text/css' in ctype:
        cached = _css_cache.get(path)
        if cached is None:
            raw = await response.aread()
            await client.aclose()
            try:
                cached = _retheme_css(raw.decode('utf-8')).encode('utf-8')
            except UnicodeDecodeError:
                cached = raw
            _css_cache[path] = cached
        else:
            await response.aclose()
            await client.aclose()
        return PlainResponse(
            content=cached,
            status_code=response.status_code,
            headers=out,
            media_type='text/css',
        )

    if 'text/html' in ctype:
        raw = await response.aread()
        await client.aclose()
        theme = request.query_params.get('cg_theme') or request.cookies.get('cg_theme') or 'dark'
        proxied = PlainResponse(
            content=_reskin(raw, theme),
            status_code=response.status_code,
            headers=out,
            media_type=response.headers.get('content-type'),
        )
    else:
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
async def seafile_ui(path: str, request: Request, principal=Depends(require_principal)):
    return await _proxy(request, principal)


@router.api_route('/seafhttp/{path:path}', methods=_METHODS)
async def seafile_fileserver(path: str, request: Request, principal=Depends(require_principal)):
    return await _proxy(request, principal)

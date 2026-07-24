"""JLab-gateway session minting (Step 3 of the process-isolation plan).

The app hands the browser a **cid-bound, signed, short-lived** session token that
the separate JLab Gateway service (different origin → own OS process) validates
before proxying to the sandbox's native JupyterLab. This module is the trust
boundary on the app side; the gateway is the trust boundary on the serving side,
and both share `CLOUDGUARD_JLAB_SECRET`.

Design (docs/architecture/artifact-fast-isolation-plan.md §1–§2):
  GET /api/cloudguard/jupyter/session?conversation_id=X   (owner-gated)
    → discover the sandbox Jupyter {container, port, jupyter-token}
    → sign {cid, host, port, jtoken, exp} into a token
    → return {url: "http(s)://{cid}.jlab.<host>/__auth?token=…", ...}
  The browser points the Notebook iframe at that URL; the gateway's /__auth
  validates the token, sets an HttpOnly cookie on the .jlab origin, and redirects
  to /lab. The token appears only in the one-time auth redirect, never persisted.

SECURITY: the token embeds the SPECIFIC cid and the gateway checks it matches the
request host — so a token minted for conversation A cannot be replayed against
conversation B's subdomain (shared cookie domain). This is an acceptance-criteria
item, not a nicety.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import logging
import os
import time

from fastapi import APIRouter, Depends, HTTPException

from openhands.server.routes.cloudguard_principal import require_principal

logger = logging.getLogger("openhands")

router = APIRouter(prefix="/api/cloudguard/jupyter")

# TTL of a minted session token (seconds). Short — the browser re-fetches on expiry.
_SESSION_TTL = int(os.environ.get("CLOUDGUARD_JLAB_SESSION_TTL", "3600"))


def _gw_secret() -> str:
    """Shared secret between the app (mints) and the gateway (validates)."""
    return os.environ.get(
        "CLOUDGUARD_JLAB_SECRET", "change-this-jlab-gateway-secret"
    )


def _jlab_domain() -> str:
    """Base domain the per-conversation subdomains hang off, incl. port if any.
    e.g. 'jlab.localhost:8087'. The browser resolves *.localhost to loopback."""
    return os.environ.get("CLOUDGUARD_JLAB_DOMAIN", "jlab.localhost:8087")


def _jlab_scheme() -> str:
    return os.environ.get("CLOUDGUARD_JLAB_SCHEME", "http")


# ── signing ───────────────────────────────────────────────────────────────────
def _b64u(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")


def _b64u_dec(s: str) -> bytes:
    pad = "=" * (-len(s) % 4)
    return base64.urlsafe_b64decode(s + pad)


def sign_session(payload: dict) -> str:
    """`<b64url(json)>.<b64url(hmac_sha256)>` — compact, URL-safe, self-contained."""
    body = _b64u(json.dumps(payload, separators=(",", ":"), sort_keys=True).encode())
    mac = hmac.new(_gw_secret().encode(), body.encode(), hashlib.sha256).digest()
    return f"{body}.{_b64u(mac)}"


def verify_session(token: str, expect_cid: str | None = None) -> dict | None:
    """Return the payload iff the signature is valid, unexpired, and (when given)
    the embedded cid matches `expect_cid`. None otherwise. This is the exact check
    the gateway performs; kept here so both sides use identical logic + tests."""
    try:
        body, mac = token.split(".", 1)
    except ValueError:
        return None
    expected = hmac.new(
        _gw_secret().encode(), body.encode(), hashlib.sha256
    ).digest()
    if not hmac.compare_digest(_b64u_dec(mac), expected):
        return None
    try:
        payload = json.loads(_b64u_dec(body))
    except Exception:  # noqa: BLE001
        return None
    if not isinstance(payload, dict):
        return None
    if int(payload.get("exp", 0)) < int(time.time()):
        return None
    # cid-binding: reject replay against a different conversation's subdomain.
    if expect_cid is not None and payload.get("cid") != expect_cid:
        return None
    return payload


# ── endpoint ──────────────────────────────────────────────────────────────────
@router.get("/session")
async def jupyter_session(conversation_id: str, _p=Depends(require_principal)):
    """Mint a gateway session for this conversation's Notebook (owner-gated).

    Returns {url, ttl} — `url` is the gateway auth-redirect URL the Notebook iframe
    loads. 404 if the runtime/Jupyter isn't up yet (caller falls back to the embed).
    """
    # Local imports so a missing dep never breaks module import / server start.
    from openhands.server.routes.jupyter_proxy import _discover
    from openhands.server.shared import conversation_manager

    conv = None
    try:
        conv = await conversation_manager.attach_to_conversation(
            conversation_id, None
        )
        if conv is None:
            raise HTTPException(status_code=404, detail="conversation not running")
        target = await _discover(conv.runtime)
        if not target or "port" not in target or "token" not in target:
            raise HTTPException(status_code=404, detail="jupyter not available")
        payload = {
            "cid": conversation_id,
            "host": target["host"],
            "port": int(target["port"]),
            "jtoken": target["token"],
            "exp": int(time.time()) + _SESSION_TTL,
        }
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        logger.warning("jupyter session mint failed: %s", exc)
        raise HTTPException(status_code=404, detail="jupyter not available") from exc
    finally:
        if conv is not None:
            try:
                await conversation_manager.detach_from_conversation(conv)
            except Exception:  # noqa: BLE001
                pass

    token = sign_session(payload)
    url = (
        f"{_jlab_scheme()}://{conversation_id}.{_jlab_domain()}"
        f"/__auth?token={token}"
    )
    return {"url": url, "ttl": _SESSION_TTL}

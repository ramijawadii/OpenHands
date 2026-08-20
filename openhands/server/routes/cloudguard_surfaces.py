"""Surface health aggregator — the fail-closed signal for the SurfaceSupervisor.

The Canvas surfaces (Notebook, Documents/Sheet, Whiteboard) each render from a
SEPARATE cross-origin backend (the JLab gateway, ONLYOFFICE, draw.io) so the
browser runs them in their own OS process (see docs/architecture/isolation-failsafe).
Those are third-party apps — they don't answer our postMessage heartbeat — so the
honest "is this surface alive?" signal is the health of its backend. This endpoint
probes each backend once and returns a per-surface verdict the frontend uses to
mount only healthy surfaces (fail closed) and to drive crash/degraded/recover UI.

Kept dependency-light and fail-open on its OWN errors: a probe that itself throws
reports the surface as unknown (not a hard failure), never 500s the endpoint.
"""

from __future__ import annotations

import asyncio
import logging
import os

import httpx
from fastapi import APIRouter, Depends

from openhands.server.routes.cloudguard_principal import require_principal

logger = logging.getLogger("openhands")

router = APIRouter(prefix="/api/cloudguard/surfaces")

# Backend probe URLs. The app reaches the side-stacks via host.docker.internal on a
# single host (localhost inside the app container is the app itself). Overridable so
# a clustered deploy can point at service DNS.
_GATEWAY_URL = os.environ.get(
    "SURFACE_HEALTH_GATEWAY_URL", "http://host.docker.internal:8087/__gwhealth"
)
# Probe the DS at its INTERNAL docker DNS (reachable from the app container), NOT the
# browser-facing gateway origin. Reuses ONLYOFFICE_INTERNAL_URL so it tracks the same
# stable service name the onlyoffice route uses (host.docker.internal:80 was the old
# host-published DS port, which the infra-as-code stack no longer exposes).
_ONLYOFFICE_URL = os.environ.get(
    "SURFACE_HEALTH_ONLYOFFICE_URL",
    os.environ.get("ONLYOFFICE_INTERNAL_URL", "http://onlyoffice-docs").rstrip("/")
    + "/healthcheck",
)
_DRAWIO_URL = os.environ.get(
    "SURFACE_HEALTH_DRAWIO_URL", "http://host.docker.internal:8085/"
)
_PROBE_TIMEOUT = float(os.environ.get("SURFACE_HEALTH_TIMEOUT", "4.0"))


async def _probe(client: httpx.AsyncClient, url: str) -> tuple[bool, str]:
    """GET a health URL. healthy = 2xx (or 3xx for a plain served page)."""
    try:
        resp = await client.get(url)
        ok = resp.status_code < 400
        return ok, ("ok" if ok else f"HTTP {resp.status_code}")
    except Exception as exc:  # noqa: BLE001
        return False, f"unreachable: {type(exc).__name__}"


# The store's own origin, from the same setting the driver uses so there is one
# place to configure it.
_ARTIFACTS_URL = (os.environ.get("CLOUDGUARD_SEAFILE_URL") or "").strip().rstrip("/")


async def _unconfigured() -> tuple[bool, str]:
    """No store configured is not a failure — the Files tab simply has no
    library view, and saying "unhealthy" would imply something is broken."""
    return True, "not configured"


async def _notebook_health(conversation_id: str | None) -> tuple[bool, str]:
    """The Notebook backend is per-conversation: it's healthy when the JLab gateway
    is up AND this conversation's runtime Jupyter is discoverable (a session can be
    minted). Falls back to gateway-only health if discovery isn't importable."""
    async with httpx.AsyncClient(timeout=_PROBE_TIMEOUT) as client:
        gw_ok, gw_reason = await _probe(client, _GATEWAY_URL)
    if not gw_ok:
        return False, f"gateway {gw_reason}"
    if not conversation_id:
        return gw_ok, "gateway ok (no conversation)"
    # Best-effort: is this conversation's runtime Jupyter reachable?
    try:
        from openhands.server.routes.jupyter_proxy import _discover  # type: ignore
        from openhands.server.shared import conversation_manager

        conversation = None
        try:
            conversation = await conversation_manager.attach_to_conversation(
                conversation_id, None
            )
            if conversation is None:
                return False, "runtime not running"
            info = await _discover(conversation.runtime)
            if info and info.get("host") and info.get("port"):
                return True, "ok"
            return False, "jupyter not discovered"
        finally:
            if conversation is not None:
                try:
                    await conversation_manager.detach_from_conversation(conversation)
                except Exception:  # noqa: BLE001
                    pass
    except Exception as exc:  # noqa: BLE001 — discovery optional; don't fail closed on our bug
        logger.debug("notebook health discovery skipped: %s", exc)
        return gw_ok, "gateway ok (discovery unavailable)"


@router.get("/health")
async def surfaces_health(
    conversation_id: str | None = None,
    _p=Depends(require_principal),
):
    """Per-surface backend health. Shape:
    { surfaces: { notebook: {healthy, reason}, onlyoffice: {...}, whiteboard: {...} } }
    The frontend maps documents+sheet → onlyoffice, whiteboard+diagram → drawio.
    """
    async with httpx.AsyncClient(timeout=_PROBE_TIMEOUT) as client:
        (
            (oo_ok, oo_reason),
            (dio_ok, dio_reason),
            nb,
            (art_ok, art_reason),
        ) = await asyncio.gather(
            _probe(client, _ONLYOFFICE_URL),
            _probe(client, _DRAWIO_URL),
            _notebook_health(conversation_id),
            # The artifact store is a heavy surface like the others: its own
            # server, its own OS process, framed cross-document. Probed here so
            # the Files tab gets the same health gate — a store that is down
            # shows a degraded card instead of an iframe rendering someone
            # else's error page.
            _probe(client, f'{_ARTIFACTS_URL}/api2/ping/') if _ARTIFACTS_URL else _unconfigured(),
        )
    nb_ok, nb_reason = nb
    return {
        "surfaces": {
            "notebook": {"healthy": nb_ok, "reason": nb_reason},
            "onlyoffice": {"healthy": oo_ok, "reason": oo_reason},
            "whiteboard": {"healthy": dio_ok, "reason": dio_reason},
            "artifacts": {"healthy": art_ok, "reason": art_reason},
        }
    }

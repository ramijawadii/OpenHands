"""CloudGuard notifications — tenant-scoped Novu subscriber handshake (extreme-isolation N0).

The browser asks for ITS subscriber identity; the server returns a tenant-namespaced subscriberId +
an HMAC subscriberHash computed with the Novu secret (which never leaves the server). The SPA then
inits @novu/js with these to open its (and only its) inbox.
"""

from __future__ import annotations

import importlib
import os

from fastapi import APIRouter, Depends, HTTPException

from openhands.server.routes.cloudguard_principal import require_cap

router = APIRouter(prefix="/api/cloudguard/notifications")


@router.get("/subscriber")
async def subscriber(p=Depends(require_cap("read"))):
    """Return this principal's tenant-scoped, HMAC-signed Novu subscriber config. 503 (not an error)
    when Novu isn't configured, so the SPA falls back to local notifications."""
    try:
        ns = importlib.import_module("cloudguard.novu_subscriber")
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=503, detail=f"novu module unavailable: {exc}") from exc
    if not ns.configured():
        raise HTTPException(status_code=503, detail="novu not configured")
    tenant = p.tenant_id
    if importlib.import_module("cloudguard.tenancy").is_strict() and tenant in ("", "default"):
        raise HTTPException(status_code=403, detail="no canonical tenant (fail-closed)")
    sid = ns.subscriber_id(tenant, p.subject)
    return {
        "applicationIdentifier": os.environ.get("NOVU_APP_ID", ""),
        "subscriberId": sid,
        "subscriberHash": ns.subscriber_hash(sid),
        "backendUrl": os.environ.get("NOVU_BACKEND_URL", ""),
        "socketUrl": os.environ.get("NOVU_SOCKET_URL", ""),
    }

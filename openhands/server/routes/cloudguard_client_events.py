"""Browser → app reliability telemetry.

The frontend contains, recovers from and COUNTS its own failures, but counters
that never leave the browser can only be read by someone with a console open
during the incident. This is the route that makes them durable.

It is deliberately NOT the sandbox `/monitoring/ingest` bridge:
  * that authenticates with a shared `X-CloudGuard-Ingest-Token`, and shipping
    that secret into a browser bundle would hand every user a key that writes
    into the tenant ledger;
  * that appends to `tenant_audit`, the tamper-evident security chain, which
    must not be diluted by client-reported UI noise.

Here the caller is a real principal, the tenant is resolved SERVER-SIDE from the
verified token (never from the body), every field is clamped by the store, and
the write goes to a separate bounded per-tenant store.

Client input is untrusted and the client controls call volume, so the route is
rate-limited per principal — otherwise a crash-looping browser becomes a write
amplifier against the app's own disk.
"""

from __future__ import annotations

import importlib
import os
import time

from fastapi import APIRouter, Body, Depends, HTTPException, Query

from openhands.server.routes.cloudguard_principal import require_cap

router = APIRouter(prefix="/api/cloudguard/client-events")

# Per-principal token bucket. A browser reporting normally sends one small batch
# every few seconds; this allows a burst (a crash storm is exactly when we most
# want the data) then throttles hard.
_BURST = 20
_REFILL_PER_SEC = 0.5
_buckets: dict[str, tuple[float, float]] = {}  # principal -> (tokens, last_ts)


def _safe(import_name: str):
    try:
        return importlib.import_module(import_name)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=503, detail=f"cloudguard unavailable: {exc}") from exc


def _allow(principal_key: str) -> bool:
    """Token bucket. Returns False when the caller must back off."""
    now = time.time()
    tokens, last = _buckets.get(principal_key, (float(_BURST), now))
    tokens = min(float(_BURST), tokens + (now - last) * _REFILL_PER_SEC)
    if tokens < 1.0:
        _buckets[principal_key] = (tokens, now)
        return False
    _buckets[principal_key] = (tokens - 1.0, now)
    return True


def _principal_key(p) -> str:
    for attr in ("subject", "sub", "id"):
        value = getattr(p, attr, None)
        if value:
            return str(value)
    if isinstance(p, dict):
        return str(p.get("subject") or p.get("sub") or p.get("id") or "anonymous")
    return "anonymous"


def _enabled() -> bool:
    """Off by default: durable client telemetry is opt-in per deployment, so a
    rollout can enable the frontend and the sink independently."""
    return os.environ.get("CLOUDGUARD_CLIENT_EVENTS_ENABLED", "0") not in ("0", "", "false")


@router.post("")
async def ingest_client_events(payload: dict = Body(...), p=Depends(require_cap("read"))):
    """Accept a batch of browser reliability events for the caller's tenant."""
    # Rate limit FIRST, before the feature flag. A disabled endpoint that answers
    # 200 to unlimited requests is still a free amplification surface; the flag
    # controls whether we STORE, not whether we bound the caller.
    key = _principal_key(p)
    if not _allow(key):
        raise HTTPException(status_code=429, detail="client-event rate limit exceeded")

    # Validate before the flag too, so a malformed client is told it is malformed
    # regardless of deployment state — otherwise the bug only appears when the
    # sink is switched on in production.
    events = payload.get("events")
    if not isinstance(events, list):
        raise HTTPException(status_code=400, detail="events must be a list")

    if not _enabled():
        # 200-with-zero rather than 404: the browser must not treat a
        # deliberately-disabled sink as an error worth retrying or reporting.
        return {"accepted": 0, "enabled": False}

    store = _safe("cloudguard.client_event_store")
    tenant = _safe("cloudguard.tenancy").resolve_tenant_id()  # server-side, ignores body
    try:
        written = store.record_batch(tenant, events, principal=key)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"accepted": written, "enabled": True, "tenant_id": tenant}


@router.get("/summary")
async def summary(
    window_sec: int = Query(3600, ge=60, le=86_400),
    p=Depends(require_cap("read")),
):
    """Counter rollup for the caller's tenant — the operator-facing read side."""
    store = _safe("cloudguard.client_event_store")
    tenant = _safe("cloudguard.tenancy").resolve_tenant_id()
    del p  # capability already enforced by the dependency
    return store.summarize(tenant, window_sec=window_sec)
